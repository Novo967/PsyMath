import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { doc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { RootStackParamList } from "../App";
import { auth, db } from "../firebaseConfig"; // ודא שהנתיב נכון

const { width } = Dimensions.get("window");

type PaywallScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Paywall"
>;

interface Props {
  navigation: PaywallScreenNavigationProp;
}

export default function PaywallScreen({ navigation }: Props) {
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (
          offerings.current !== null &&
          offerings.current.availablePackages.length !== 0
        ) {
          setPackages(offerings.current.availablePackages);
          // בחירת חבילת ברירת מחדל
          setSelectedPackage(offerings.current.availablePackages[0]);
        }
      } catch (e) {
        console.error("Error fetching offerings", e);
        Alert.alert(
          "שגיאה",
          "לא הצלחנו לטעון את חבילות הרכישה. אנא בדוק את החיבור לאינטרנט.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchOfferings();
  }, []);

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setIsPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
      const isUserPremium =
        !!customerInfo.entitlements.active["כמותי לפסיכומטרי Pro"];

      if (isUserPremium) {
        if (auth.currentUser) {
          try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userRef, {
              isPremium: true,
            });
          } catch (error) {
            console.error("Error updating Firebase:", error);
          }
        }
        Alert.alert("מעולה!", "הצטרפת בהצלחה למנויי הפרימיום שלנו.", [
          { text: "המשך ללמידה", onPress: handleClose },
        ]);
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("שגיאה", "הייתה בעיה בביצוע הרכישה. אנא נסה שוב.");
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const features = [
    "תרגול שאלות באופן חופשי ללא הגבלה",
    "תרגול סימולציות ללא הגבלה",
    "גישה מלאה לחומרי הלימוד באפליקציה",
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* כותרת */}
        <View style={styles.headerContainer}>
          <Ionicons
            name="star"
            size={50}
            color="#F3902E"
            style={styles.headerIcon}
          />
          <Text style={styles.title}>שדרג לפרימיום</Text>
          <Text style={styles.subtitle}>
            פתח את כל האפשרויות והגע מוכן למבחן הפסיכומטרי
          </Text>
        </View>

        {/* רשימת פיצ'רים */}
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureText}>{feature}</Text>
              <Ionicons name="checkmark-circle" size={24} color="#2695D8" />
            </View>
          ))}
        </View>

        {/* אזור טעינה או כרטיסיות חבילות */}
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#162C5B"
            style={{ marginTop: 20 }}
          />
        ) : (
          <View style={styles.packagesContainer}>
            {packages.map((pkg) => {
              const isSelected = selectedPackage?.identifier === pkg.identifier;

              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  activeOpacity={0.8}
                  style={[
                    styles.packageCard,
                    isSelected && styles.selectedPackageCard,
                  ]}
                  onPress={() => setSelectedPackage(pkg)}
                >
                  <View style={styles.packageHeader}>
                    <Text style={styles.packageTitle}>
                      {pkg.product.title.replace("(App Name)", "").trim()}{" "}
                      {/* מנקה את שם האפליקציה אם אפל מוסיפים אוטומטית */}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#2695D8"
                      />
                    )}
                  </View>
                  <Text style={styles.packagePrice}>
                    {pkg.product.priceString}
                  </Text>

                  {/* הערת תקופת ניסיון - כרגע בטקסט קבוע */}
                  <View style={styles.trialContainer}>
                    <Text style={styles.trialText}>לא צריך לזכור לבטל!</Text>
                    <Text style={styles.trialSubText}>
                      המנוי מסתיים בתום התקופה ואינו מתחדש אוטומטית.
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* כפתור רכישה */}
        {!isLoading && packages.length > 0 && (
          <TouchableOpacity
            style={[
              styles.purchaseButton,
              isPurchasing && styles.purchaseButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={isPurchasing || !selectedPackage}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.purchaseButtonText}>שדרג עכשיו</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#9dbde9", // רקע תואם למסך הבית
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },

  headerContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  headerIcon: {
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#ffffff",
    textAlign: "center",
    opacity: 0.8,
  },
  featuresContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: "#162C5B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 15,
  },
  featureText: {
    fontSize: 16,
    color: "#162C5B",
    fontWeight: "600",
    marginRight: 10,
    textAlign: "right",
    flex: 1,
  },
  packagesContainer: {
    gap: 15,
    marginBottom: 30,
  },
  packageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#162C5B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedPackageCard: {
    borderColor: "#2695D8",
    backgroundColor: "#F4F9FD", // גוון תכלת עדין כשנבחר
  },
  packageHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  packageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#162C5B",
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2695D8",
    textAlign: "right",
    marginBottom: 10,
  },
  trialContainer: {
    backgroundColor: "#E6F4EA", // ירוק בהיר שמשרה ביטחון
    padding: 10,
    borderRadius: 8,
    alignItems: "flex-end",
  },
  trialText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#137333",
  },
  trialSubText: {
    fontSize: 12,
    color: "#137333",
    marginTop: 2,
  },
  purchaseButton: {
    backgroundColor: "#F3902E", // כפתור כתום בולט
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#F3902E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
});
