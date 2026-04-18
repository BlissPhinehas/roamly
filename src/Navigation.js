import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useApp } from "./context/AppContext";
import AuthScreen from "./screens/AuthScreen";
import ChildSelectScreen from "./screens/ChildSelectScreen";
import WorldScreen from "./screens/WorldScreen";

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const { session, activeChild } = useApp();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : !activeChild ? (
          <Stack.Screen name="ChildSelect" component={ChildSelectScreen} />
        ) : (
          <Stack.Screen name="World" component={WorldScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
