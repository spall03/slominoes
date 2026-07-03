const fs = require('fs/promises');
const { IOSConfig, WarningAggregator, withDangerousMod } = require('@expo/config-plugins');

const PLUGIN_NAME = 'with-firebase-swift-app-delegate';
const IMPORT_LINE = 'import FirebaseCore';
const CONFIGURE_LINE = '    FirebaseApp.configure()';
const FACTORY_BIND_ANCHOR = '    bindReactNativeFactory(factory)\n';

function addFirebaseInitialization(contents) {
  let updated = contents;

  if (!updated.includes(IMPORT_LINE)) {
    updated = updated.replace(/^import Expo$/m, `import Expo\n${IMPORT_LINE}`);
  }

  if (updated.includes('FirebaseApp.configure()')) {
    return updated;
  }

  if (!updated.includes(FACTORY_BIND_ANCHOR)) {
    WarningAggregator.addWarningIOS(
      PLUGIN_NAME,
      'Unable to find Expo Swift AppDelegate factory binding. Skipping Firebase initialization.'
    );
    return updated;
  }

  return updated.replace(
    FACTORY_BIND_ANCHOR,
    `${FACTORY_BIND_ANCHOR}\n// @generated begin ${PLUGIN_NAME}\n${CONFIGURE_LINE}\n// @generated end ${PLUGIN_NAME}\n`
  );
}

module.exports = function withFirebaseSwiftAppDelegate(config) {
  return withDangerousMod(config, [
    'ios',
    async config => {
      const appDelegate = IOSConfig.Paths.getAppDelegate(config.modRequest.projectRoot);

      if (appDelegate.language !== 'swift') {
        return config;
      }

      const contents = await fs.readFile(appDelegate.path, 'utf8');
      const updated = addFirebaseInitialization(contents);

      if (updated !== contents) {
        await fs.writeFile(appDelegate.path, updated);
      }

      return config;
    },
  ]);
};
