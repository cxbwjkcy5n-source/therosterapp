const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MIN_IOS_VERSION = '16.0';
const PATCH_COMMENT = '# [withIosDeploymentTarget] auto-patched';

const DEPLOYMENT_TARGET_BLOCK = `  ${PATCH_COMMENT}
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      deployment_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      if deployment_target.nil? || deployment_target.to_f < ${MIN_IOS_VERSION}
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_IOS_VERSION}'
      end
    end
  end`;

/**
 * Patches the generated Podfile to enforce a minimum iOS deployment target
 * on all pods. Merges into the existing post_install block rather than
 * adding a second one (CocoaPods forbids multiple post_install hooks).
 * Survives every `expo prebuild --platform ios --clean` cycle.
 */
module.exports = function withIosDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Idempotency guard — already patched
      if (podfile.includes(PATCH_COMMENT)) return config;

      // Strategy 1: inject into the existing post_install block
      const existingHook = /^post_install do \|installer\|/m;
      if (existingHook.test(podfile)) {
        podfile = podfile.replace(
          existingHook,
          `post_install do |installer|\n${DEPLOYMENT_TARGET_BLOCK}\n`
        );
        fs.writeFileSync(podfilePath, podfile);
        return config;
      }

      // Strategy 2: no existing post_install — append a new one
      const newHook = `\n${PATCH_COMMENT}\npost_install do |installer|\n${DEPLOYMENT_TARGET_BLOCK}\nend\n`;
      podfile = podfile.trimEnd() + '\n' + newHook + '\n';
      fs.writeFileSync(podfilePath, podfile);

      return config;
    },
  ]);
};
