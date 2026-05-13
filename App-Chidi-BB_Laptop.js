import { SafeAreaProvider } from "react-native-safe-area-context";
import Navigation from "./src/Navigation";
import { AppProvider } from "./src/context/AppContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Navigation />
      </AppProvider>
    </SafeAreaProvider>
  );
}
