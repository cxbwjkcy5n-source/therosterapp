const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MIN_IOS_VERSION = '16.0';

/**
 * Patches the generated Podfile to enforce a minimum iOS deployment target
 * on all pods. This fixes build errors from RNCAsyncStorage, RNSVG, SDWebImage,
 * and other pods that default to a lower deployment target than the app target.
 * Survives every `expo prebuild` + `pod install` cycle.
 */
module.exports = function withIosDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Inject a post_install hook that raises every pod's deployment target
      // to MIN_IOS_VERSION if it is lower. Insert before the final `end` of
      // the file so it appends after any existing post_install hooks.
      const patchComment = '# [withIosDeploymentTarget] auto-patched';
      if (podfile.includes(patchComment)) return config; // already patched

      const postInstallHook = `
${patchComment}
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      deployment_target = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
      if deployment_target.nil? || deployment_target.to_f < ${MIN_IOS_VERSION}
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_IOS_VERSION}'
      end
    end
  end
end
`;

      // Append after the last line
      podfile = podfile.trimEnd() + '\n' + postInstallHook + '\n';
      fs.writeFileSync(podfilePath, podfile);

      return config;
    },
  ]);
};
