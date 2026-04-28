import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { StyleSheet, View } from "react-native";
import RevenueCatUI from "react-native-purchases-ui";
import { RootStackParamList } from "../App";
// ייבוא פיירבייס - חובה להוסיף!
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

type PaywallScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Paywall"
>;

interface Props {
  navigation: PaywallScreenNavigationProp;
}

export default function PaywallScreen({ navigation }: Props) {
  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <RevenueCatUI.Paywall
        onDismiss={handleClose}
        onPurchaseCompleted={async ({ customerInfo }) => {
          const isUserPremium =
            !!customerInfo.entitlements.active["כמותי לפסיכומטרי Pro"];

          if (isUserPremium) {
            // עדכון מיידי של פיירבייס!
            if (auth.currentUser) {
              try {
                const userRef = doc(db, "users", auth.currentUser.uid);
                await updateDoc(userRef, {
                  isPremium: true,
                });
                console.log("Firebase updated successfully to Premium!");
              } catch (error) {
                console.error("Error updating Firebase:", error);
              }
            }

            // סגירת המסך אחרי שהכל התעדכן
            handleClose();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
