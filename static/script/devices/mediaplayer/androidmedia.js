/**
* This file is part of Hotel IPTV software
*
* Copyright (c) 2019 Moojafzar mehreghan kish
* All rights reserved
*    
* @author: Karim Davoodi
* @email:  KarimDavoodi@gmail.com
* @date:   July 2019
*
**/

require.def(
		'antie/devices/media/androidmedia',
		[
		'antie/devices/device',
		'antie/devices/media/mediainterface',
		'antie/events/mediaevent',
		'antie/events/mediaerrorevent',
		'antie/events/mediasourceerrorevent',
		'antie/mediasource',
		'antie/application'
		],
		function(Device, MediaInterface, MediaEvent, MediaErrorEvent, MediaSourceErrorEvent, MediaSource, Application) {
			'use strict';

			var AndroidPlayer = MediaInterface.extend({
				init: function(id, mediaType, eventHandlingCallback) {
					this._super(id);
					this._eventHandlingCallback = eventHandlingCallback;
					this.mediaSource = null;

                    this.live_channel_name = "";

					if (mediaType === "audio") {
						this._mediaType = "audio";
					} else if (mediaType === "video") {
						this._mediaType = "video";
					} else {
						throw new Error('Unrecognised media type: ' + mediaType);
					}

					this.videoPlayerState = {
						durationSeconds  : 0,
				currentTime: 0,
				playbackRate: undefined,
				paused: false,
				ended: false,
				seeking: false,
				playing: false
					};

					this.registerEventHandlers();
					this.androidMedia = null;
				},
					registerEventHandlers : function() {
						var self = this;
						window.OnPlayEnd = function () {
							var that = self;
							setTimeout(function(){
								that.videoPlayerState.ended = true;
								that._eventHandlingCallback(new MediaEvent("ended", that));
							},2000);
						};
						/*
						   this._eventHandlingCallback(new MediaEvent("canplay", this));
						   this._eventHandlingCallback(new MediaEvent("ended", this));
						   this._eventHandlingCallback(new MediaEvent("play", this));
						   this._eventHandlingCallback(new MediaEvent("playing", this));
						 */
					},

					render: function(device) { 
						if (!this.outputElement) {
							this.outputElement = document.createElement("div");
						}
						return this.outputElement;
					},

					setWindow: function(left, top, width, height) {
						if (this._mediaType === "audio") {
							throw new Error('Unable to set window size for Samsung audio.');
						}
					},
					changeAudio: function() {
						if(window.api_android) return window.api_android.changeAudio();
					},
					getError: function() {
						if(window.api_android && window.api_android.getMediaError)
								return window.api_android.getMediaError();
						else return "";
					},

					setChanName: function(name) {
                        this.live_channel_name = name;
                    },
					setSources: function(sources, tags) {
						this.videoPlayerState = {
							durationSeconds  : 0,
							currentTime: 0,
							playbackRate: undefined,
							paused: false,
							ended: false,
							seeking: false,
							playing: false
						};
						this.mediaSource = sources[0];
						//	"url":this.mediaSource.src, 
						//	"mimeType":this.mediaSource.type,
						return this.androidMedia;  // null if can't create
					},
					getSources: function() {
						return [this.mediaSource];
					},
					getCurrentSource: function() {
						return this.mediaSource.src;
					},
					getNetworkState: function() {
					},
					getPreload: function() {
						return "none";
					},
					setPreload: function(preload) { //jshint ignore:line
					},
					getBuffered: function() {
						return [];
					},
					load: function() {
						this.videoPlayerState.playbackRate = 1;
						this.videoPlayerState.paused = false;
						this.videoPlayerState.ended = false;
						this.videoPlayerState.playing = false;

						if (this.videoPlayerState.currentTime > 0) {
							//resume();
						}
						else {
							//play();
						}
					},
					canPlayType: function(type) { //jshint ignore:line
						return true;
					},
					getReadyState: function() {
						return 0;
					},
					getSeeking: function() {
						return false;
					},
					setCurrentTime: function(timeToSeekTo) {
						if(window.api_android) return window.api_android.setMediaCurrentPosition(timeToSeekTo);

						this.videoPlayerState.seeking = true;
						this._eventHandlingCallback(new MediaEvent('seeking', this));
						this.videoPlayerState.currentTime = timeToSeekTo;
					},
					getCurrentTime: function() {
						if(window.api_android) return window.api_android.getMediaCurrentPosition();

						//return this.videoPlayerState.currentTime;
					},
					getInitialTime: function() {
						return 0;
					},
					getDuration: function() {
						if(window.api_android) return window.api_android.getMediaDuration();

					},
					getStartOffsetTime: function() {
						return 0;
					},
					getPaused: function() {
						return this.videoPlayerState.paused;
					},
					getDefaultPlaybackRate: function() {
						return 1;
					},
					getPlaybackRate: function() {
						return 1;
					},
					setPlaybackRate: function(playbackRate) { //jshint ignore:line
					},
					getPlayed: function() {
						return [];
					},
					getSeekable: function() {
						return [];
					},
					getEnded: function() {
						return false;
					},
					getAutoPlay: function() {
						return false;
					},
					setAutoPlay: function(autoplay) { 
					},
					getLoop: function() {
						return false;
					},
					setLoop: function(loop) { 
					},
					play: function() {
						//G.log("play media:"+this.mediaSource.src);
						if(window.api_android){ 
                            window.api_android.PlayMedia(this.mediaSource.src,
                                    this._mediaType,
                                    this.live_channel_name);
                        }

						else G.log("androidmedia:play interface not exist!");
					},
					stop: function() {
						if(window.api_android) window.api_android.StopMedia();
						else G.log("andridmedia:stop interface not exist!");
					},
					pause: function() {
						if(window.api_android)  window.api_android.PauseMedia();
						else G.log("andridmedia:pause interface not exist!");
					},
					setNativeControls: function(controls) { 
					},
					getNativeControls: function() {
						return false;
					},
					destroy: function() {
						this.androidMedia = null;
					},
			});

			Device.prototype.createMediaInterface = function(id, mediaType, eventCallback) {
				return new AndroidPlayer(id, mediaType, eventCallback);
			};

			Device.prototype.getPlayerEmbedMode = function(mediaType) { //jshint ignore:line
				return MediaInterface.EMBED_MODE_BACKGROUND;
			};
			Device.prototype.isVolumeControlSupported = function() {
				return true;
			};
			Device.prototype.getVolume = function() {
				if(window.api_android) return window.api_android.GetVolume();
				else return 0;
			};
			Device.prototype.setVolume = function(volume,ui) {
				if(window.api_android) window.api_android.SetVolume(volume,ui);
			};
			Device.prototype.getMuted = function() {
			};
			Device.prototype.setMuted = function(muted) {
			};
			return AndroidPlayer;
		}
);
