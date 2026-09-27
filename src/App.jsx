import { HoldrProvider, useHoldr } from './state';
import { useRoute } from './hooks/useRoute';
import { TopBar, BottomBar, Toast } from './components/Shell';
import AddHolding from './components/AddHolding';
import { ErrorBoundary } from './components/ui';
import Today from './views/Today';
import Holdings from './views/Holdings';
import Stock from './views/Stock';
import Tax from './views/Tax';
import Market from './views/Market';

function Screen({ route }) {
  if (route.section === 'holdings' && route.id) return <Stock key={route.id} id={route.id} />;
  switch (route.section) {
    case 'holdings': return <Holdings />;
    case 'tax': return <Tax />;
    case 'market': return <Market />;
    default: return <Today />;
  }
}

function Layout() {
  const route = useRoute();
  const { adding } = useHoldr();
  return (
    <>
      <div className="atmosphere" aria-hidden="true" />
      <div className="relative z-10 min-h-[100dvh] pb-28 md:pb-16">
        <TopBar section={route.section} />
        <main className="max-w-[1120px] mx-auto px-4 sm:px-6">
          <ErrorBoundary key={route.path}>
            <Screen route={route} />
          </ErrorBoundary>
        </main>
      </div>
      <BottomBar section={route.section} />
      {adding && <AddHolding />}
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <HoldrProvider>
      <Layout />
    </HoldrProvider>
  );
}
