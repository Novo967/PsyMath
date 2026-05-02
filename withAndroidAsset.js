const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withAndroidAsset(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      // נתיב היעד בתוך תיקיית האנדרואיד שנוצרת בענן
      const targetPath = path.join(
        config.modRequest.platformProjectRoot,
        "app/src/main/assets/adi-registration.properties",
      );
      // נתיב המקור בתיקייה הראשית של הפרויקט
      const sourcePath = path.join(
        config.modRequest.projectRoot,
        "adi-registration.properties",
      );

      // יצירת תיקיית assets אם היא עדיין לא קיימת
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });

      // העתקת הקובץ לתוך האפליקציה
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
      }

      return config;
    },
  ]);
};
