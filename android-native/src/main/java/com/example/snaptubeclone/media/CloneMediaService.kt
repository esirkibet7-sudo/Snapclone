package com.example.snaptubeclone.media

import androidx.media3.session.MediaSessionService
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession

class CloneMediaService: MediaSessionService(){
    private var player:ExoPlayer?=null
    private var session:MediaSession?=null
    override fun onCreate(){super.onCreate();player=ExoPlayer.Builder(this).build();session=MediaSession.Builder(this,player!!).build()}
    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo)=session
    override fun onDestroy(){session?.release();player?.release();session=null;player=null;super.onDestroy()}
}
