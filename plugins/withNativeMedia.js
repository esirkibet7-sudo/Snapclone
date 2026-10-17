const {withAppBuildGradle,withAndroidManifest,withDangerousMod}=require('@expo/config-plugins');
const fs=require('fs');const path=require('path');
const media3=[
'    implementation("androidx.media3:media3-exoplayer:1.10.0")',
'    implementation("androidx.media3:media3-ui:1.10.0")',
'    implementation("androidx.media3:media3-session:1.10.0")',
'    implementation("androidx.media3:media3-exoplayer-hls:1.10.0")',
'    implementation("androidx.media3:media3-datasource:1.10.0")'
];
function withNativeMedia(config){
  config=withAppBuildGradle(config,c=>{
    if(c.modResults.language==='groovy'&&!c.modResults.contents.includes('media3-exoplayer')){
      c.modResults.contents=c.modResults.contents.replace(/dependencies\s*\{/, 'dependencies {\n'+media3.join('\n')+'\n');
    }
    return c;
  });
  config=withAndroidManifest(config,c=>{
    const app=c.modResults.manifest.application?.[0];
    if(!app)return c;
    app.service=app.service||[];
    const add=(name,type,action)=>{
      if(!app.service.some(x=>x.$?.['android:name']===name)){
        app.service.push({
          $:{
            'android:name':name,
            'android:exported':type==='media'?'true':'false',
            'android:foregroundServiceType':type==='media'?'mediaPlayback':'dataSync'
          },
          'intent-filter':action?[{action:[{$:{'android:name':action}}],category:[{$:{'android:name':'android.intent.category.DEFAULT'}}]}]:[]
        });
      }
    };
    add('com.example.snaptubeclone.media.CloneDownloadService','download','androidx.media3.exoplayer.downloadService.action.RESTART');
    add('com.example.snaptubeclone.media.CloneMediaService','media','androidx.media3.session.MediaSessionService');
    return c;
  });
  config=withDangerousMod(config,['android',async c=>{
    const root=c.modRequest.platformProjectRoot;
    const src=path.join(root,'app/src/main/java/com/example/snaptubeclone/media');
    fs.mkdirSync(src,{recursive:true});
    for(const f of ['CloneDownloadService.kt','CloneMediaService.kt']){
      fs.copyFileSync(
        path.join(c.modRequest.projectRoot,'android-native/src/main/java/com/example/snaptubeclone/media',f),
        path.join(src,f)
      );
    }
    return c;
  }]);
  return config;
}
module.exports=withNativeMedia;
