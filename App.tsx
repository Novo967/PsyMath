import React, { useState, useEffect } from 'react';
import { Platform, TouchableOpacity, Text, View, ActivityIndicator, I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseConfig';
// Import Screens
import HomeScreen from './screens/HomeScreen';
import StudyMaterialsScreen from './screens/StudyMaterialsScreen';
import PracticeScreen from './screens/PracticeScreen';
import SimulationScreen from './screens/SimulationScreen';
import StatisticsScreen from './screens/StatisticsScreen';
import SignUpScreen from './screens/SignUpScreen';
import SimulationResultsScreen from './screens/SimulationResultsScreen'; // ודא שהנתיב לקובץ נכון
export type RootStackParamList = {
  Home: undefined;
  StudyMaterials: undefined;
  Practice: undefined;
  Simulation: undefined;
  Statistics: undefined;
  SignUp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);
export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={({ navigation }) => ({
          headerStyle: { backgroundColor: '#F8F9FA' },
          headerShadowVisible: false,
          headerTitle: '', 
          headerBackVisible: false,
          headerLeft: () => null,
          headerRight: () => {
            if (Platform.OS === 'ios' && navigation.canGoBack()) {
              return (
                <TouchableOpacity 
                  onPress={() => navigation.goBack()} 
                  style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 10 }}
                >
                  <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '500', marginRight: 4 }}>חזור</Text>
                  <Ionicons name="chevron-forward" size={22} color="#007AFF" />
                </TouchableOpacity>
              );
            }
            return null;
          }
        })}
      >
        {user ? (
          // App Stack (Authenticated users)
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="StudyMaterials" component={StudyMaterialsScreen} />
            <Stack.Screen name="Practice" component={PracticeScreen} />
            <Stack.Screen name="Simulation" component={SimulationScreen} />
            <Stack.Screen name="Statistics" component={StatisticsScreen} />
            <Stack.Screen 
              name="SimulationResultsScreen" 
              component={SimulationResultsScreen} 
              options={{ title: 'תוצאות המבחן' }} 
            />
          </>
        ) : (
          // Auth Stack (Guest users)
          <Stack.Screen 
            name="SignUp" 
            component={SignUpScreen} 
            options={{ headerShown: false }} // Hide header for sign up screen
          />
        )}
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}