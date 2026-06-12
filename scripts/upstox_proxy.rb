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
