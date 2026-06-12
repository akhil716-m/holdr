#!/usr/bin/env ruby
# Holdr <-> Upstox bridge
#
# Why this exists: the Upstox API cannot be called from a web page directly
# (no CORS, and your API secret must never ship to the browser). This tiny
# local server handles the once-a-day Upstox login and proxies API calls
# with the token attached. Nothing leaves your machine.
#
# Setup (once):
#   1. Create an app at https://account.upstox.com/developer/apps
#      - Redirect URL: http://localhost:8765/callback
#   2. Copy scripts/upstox_config.example.json to scripts/upstox_config.json
#      and fill in your api_key / api_secret (this file is gitignored).
#
# Run (daily):
#   ruby scripts/upstox_proxy.rb
#   then open http://localhost:8765/login once to authenticate.

require 'webrick'
require 'net/http'
require 'json'
require 'uri'

CONFIG_PATH = File.join(__dir__, 'upstox_config.json')
TOKEN_PATH  = File.join(__dir__, '.upstox_token.json')
PORT        = 8765
REDIRECT    = "http://localhost:#{PORT}/callback"

unless File.exist?(CONFIG_PATH)
  abort "Missing #{CONFIG_PATH}\nCopy upstox_config.example.json to upstox_config.json and add your api_key/api_secret."
end
CFG = JSON.parse(File.read(CONFIG_PATH))

server = WEBrick::HTTPServer.new(
  Port: PORT,
  AccessLog: [],
  Logger: WEBrick::Log.new($stderr, WEBrick::Log::WARN)
)

# Step 1: kick off Upstox OAuth
server.mount_proc '/login' do |_req, res|
  url = "https://api.upstox.com/v2/login/authorization/dialog" \
        "?response_type=code&client_id=#{CFG['api_key']}" \
        "&redirect_uri=#{URI.encode_www_form_component(REDIRECT)}"
  res.set_redirect(WEBrick::HTTPStatus::Found, url)
end

# Step 2: Upstox redirects back here; exchange the code for a token
server.mount_proc '/callback' do |req, res|
  code = req.query['code']
  r = Net::HTTP.post_form(
    URI('https://api.upstox.com/v2/login/authorization/token'),
    'code' => code, 'client_id' => CFG['api_key'],
    'client_secret' => CFG['api_secret'],
    'redirect_uri' => REDIRECT, 'grant_type' => 'authorization_code'
  )
  File.write(TOKEN_PATH, r.body)
  ok = JSON.parse(r.body)['access_token'] rescue nil
  res['Content-Type'] = 'text/html'
  res.body = ok ? '<h3 style="font-family:sans-serif">Holdr is connected to Upstox &#10003;</h3>You can close this tab and refresh Holdr.' \
                : "<h3 style=\"font-family:sans-serif\">Login failed</h3><pre>#{r.body}</pre>"
end

# Health check for the app
server.mount_proc '/ping' do |_req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Content-Type'] = 'application/json'
  token = File.exist?(TOKEN_PATH) ? (JSON.parse(File.read(TOKEN_PATH))['access_token'] rescue nil) : nil
  res.body = { ok: true, authenticated: !token.nil? }.to_json
end

# NSE FII/DII daily activity — no auth, but NSE needs a cookie handshake.
# Hit the homepage first to collect cookies, then call the data API.
$nse_cookie = nil
def nse_get(path)
  hdr = {
    'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept' => 'application/json, text/plain, */*',
    'Accept-Language' => 'en-US,en;q=0.9',
    'Referer' => 'https://www.nseindia.com/',
  }
  Net::HTTP.start('www.nseindia.com', 443, use_ssl: true) do |http|
    unless $nse_cookie
      home = http.get('/', hdr)
      $nse_cookie = (home.get_fields('set-cookie') || []).map { |c| c.split(';').first }.join('; ')
    end
    res = http.get(path, hdr.merge('Cookie' => $nse_cookie))
    if res.code.to_i == 401 || res.code.to_i == 403
      $nse_cookie = nil # stale cookies — force re-handshake next call
    end
    res
  end
end

# Yahoo Finance passthrough — server-side, no CORS proxy needed.
# Used for macro (gold/silver/USD-INR/crude/VIX) and as a stock fallback.
server.mount_proc '/yahoo' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Content-Type'] = 'application/json'
  begin
    sym = req.query['symbol'].to_s
    range = req.query['range'] || '1mo'
    interval = req.query['interval'] || '1d'
    path = "/v8/finance/chart/#{URI.encode_www_form_component(sym)}?range=#{range}&interval=#{interval}"
    out = Net::HTTP.start('query2.finance.yahoo.com', 443, use_ssl: true) do |http|
      http.get(path, 'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
    end
    res.status = out.code.to_i
    res.body = out.body
  rescue => e
    res.status = 502
    res.body = { error: e.message }.to_json
  end
end

server.mount_proc '/nse/fiidii' do |_req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Content-Type'] = 'application/json'
  begin
    out = nse_get('/api/fiidiiTradeReact')
    out = nse_get('/api/fiidiiTradeReact') if out.code.to_i >= 400 # one retry after re-handshake
    res.status = out.code.to_i
    res.body = out.body
  rescue => e
    res.status = 502
    res.body = { error: e.message }.to_json
  end
end

# Proxy: /api/<anything> -> https://api.upstox.com/<anything> with the token
server.mount_proc '/api' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Content-Type'] = 'application/json'
  token = File.exist?(TOKEN_PATH) ? (JSON.parse(File.read(TOKEN_PATH))['access_token'] rescue nil) : nil
  if token.nil?
    res.status = 401
    res.body = { error: 'not_authenticated', hint: "open http://localhost:#{PORT}/login" }.to_json
  else
    # unparsed_uri keeps the original percent-encoding (instrument keys
    # contain '|' and spaces); req.path would decode them and break URI()
    raw = req.unparsed_uri.sub(%r{^/api}, '')
    out = Net::HTTP.start('api.upstox.com', 443, use_ssl: true) do |http|
      http.get(raw, 'Authorization' => "Bearer #{token}", 'Accept' => 'application/json')
    end
    res.status = out.code.to_i
    res.body = out.body
  end
end

puts "Holdr ↔ Upstox bridge running on http://localhost:#{PORT}"
puts "First time today? Open http://localhost:#{PORT}/login to authenticate."
trap('INT') { server.shutdown }
server.start
