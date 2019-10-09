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
    'antie/devices/media/html5hls',
    [
        'antie/devices/device',
        'antie/devices/media/mediainterface',
        'antie/events/mediaevent',
        'antie/events/mediaerrorevent',
        'antie/events/mediasourceerrorevent',
        'antie/mediasource',
        'antie/application',
        'antie/devices/media/hls'
    ],
    function(Device, MediaInterface, MediaEvent, MediaErrorEvent, MediaSourceErrorEvent, MediaSource, Application,Hls) {
        'use strict';

        var currentPlayer = null;
        var isMuted = null;
        var currentVolume = -1;

        var HTML5HLSPlayer = MediaInterface.extend({
            init: function(id, mediaType, eventHandlingCallback) {
                this._super(id);
				this.is_hls = false;
				this.hls = null;
				this.src = "";
				this.Hls = null;

				if (typeof Hls !== 'undefined') {
					this.Hls = Hls;
				}
				if (typeof window.Hls !== 'undefined') {
					this.Hls = window.Hls;
				}
                if(this.Hls == null || !this.Hls.isSupported()){
                    G.log("Client dose not support HLS!");
                }
                this._eventHandlingCallback = eventHandlingCallback;

                if (mediaType == "audio") {
                    this._mediaType = "audio";
                } else if (mediaType == "video") {
                    this._mediaType = "video";
                } else {
                    throw new Error('Unrecognised media type: ' + mediaType);
                }

                // Create the DOM element now so the wrapped functions can modify attributes
                // before it is placed in the Document during rendering.
                var device = Application.getCurrentApplication().getDevice();
                this._mediaElement = device._createElement(this._mediaType, id);

                if (currentVolume != -1) {
                    this._mediaElement.volume = currentVolume;
                } else {
                    currentVolume = this._mediaElement.volume;
                }
                if (isMuted !== null) {
                    this._mediaElement.muted = isMuted;
                } else {
                    isMuted = this._mediaElement.muted;
                }

                this._eventWrapper = null;
                this._errorEventWrapper = null;
            },
            render: function(device) {
                if (!this._renderCalled) {
                    this._renderCalled = true;

                    // Convert all media events into our internal representation and bubble them through
                    // the UI widgets
                    var self = this;
                    this._eventWrapper = function(evt) {
                        self._eventHandlingCallback(new MediaEvent(evt.type, self));
                    };
                    this._errorEventWrapper = function(evt) {
                        var errCode = self._mediaElement.error ? self._mediaElement.error.code : MediaInterface.MEDIA_ERR_UNKNOWN;
                        self._eventHandlingCallback(new MediaErrorEvent(self, errCode));
                    };
                    for (var i = 0; i < MediaEvent.TYPES.length; i++) {
                        this._mediaElement.addEventListener(MediaEvent.TYPES[i], this._eventWrapper, true);
                    }
                    this._mediaElement.addEventListener("error", this._errorEventWrapper, true);
                }

                return this._mediaElement;
            },
            // (not part of HTML5 media)
            setWindow: function(left, top, width, height) {
                if (this._mediaType == "audio") {
                    throw new Error('Unable to set window size for HTML5 audio.');
                }
                var device = Application.getCurrentApplication().getDevice();
                device.setElementSize(this._mediaElement, {width:width, height:height});
                device.setElementPosition(this._mediaElement, {left:left, top:top});
            },
            // readonly attribute MediaError error;
            getError: function() {
                return this._mediaElement.error;
            },
            _supportsTypeAttribute: function() {
                return true;
            },
            _requiresWebkitMemoryLeakFix: function() {
                return false;
            },
            initHLS: function() {
                var self = this;

                var config = {
                    //maxBufferLength: 90,    // 30 
                    //maxBufferSize: 200 * 1024 * 1024,   //60 * 1024*1024
                    //maxBufferHole: 2,       // 0.5
                    //maxStarvationDelay: 6,  //4
                    //maxLoadingDelay: 10,    //4
                    //liveSyncDurationCount: 5, // 3
                    //appendErrorMaxRetry: 5, // 3
                    liveDurationInfinity: true, // false
                    //enableWorker: false, //true
                    debug: D.debug
                };
                if(D.debug) console.log(config);
                this.hls = new this.Hls(config);
                this.hls.loadSource(this.src);
                this.hls.attachMedia(this._mediaElement);
                this.hls.on(this.Hls.Events.ERROR, function (event, data) {
                    if (data.fatal) {
                        switch(data.type) {
                            case self.Hls.ErrorTypes.NETWORK_ERROR:
                                console.log("HLS:try to recover network error");
                                self.hls.startLoad();
                                break;
                            case self.Hls.ErrorTypes.MEDIA_ERROR:
                                console.log("HLs: try to recover media error");
                                self.hls.recoverMediaError();
                                break;
                            default:
                                console.log("destroy hls!");
                                self.hls.destroy();
                                break;
                        }
                    }
                });

                this.hls.on(this.Hls.Events.MANIFEST_PARSED,function() {
                    //hls.startLoad(79071);
                    try{
                        self._mediaElement.play();
                    }catch(err){
                            G.log(err);
                    }
                });
            },
            fullScreen: function (){
                var elem = document.documentElement;
                if (elem.requestFullscreen) {
                    elem.requestFullscreen();
                } else if (elem.mozRequestFullScreen) { /* Firefox */
                    elem.mozRequestFullScreen();
                } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
                    elem.webkitRequestFullscreen();
                } else if (elem.msRequestFullscreen) { /* IE/Edge */
                    elem.msRequestFullscreen();
                }else{

                }
            },
            // Similar to src attribute or 'source' child elements:
            // attribute DOMString src;
            setSources: function(sources, tags) {
                var self = this;
                //this.fullScreen();
                this.src = sources[0].src; 
                if(this.Hls!=null && this.src.indexOf("m3u8") != -1){
                    if(!this.Hls.isSupported()) {
                        G.log("Not support HLS!");
                        //return;
                    }
                    this.is_hls = true;
                    this.initHLS();
                    if(D.debug)G.log("Init HLS player for:"+this.src);
                }else{
                    this.setSourcesHtml(sources, tags);
                    this.is_hls = false;
                    if(D.debug)G.log("Init HTML5 player for:"+this.src);
                }
            },
            setSourcesHtml: function(sources, tags) {
                var self = this;
                var device = Application.getCurrentApplication().getDevice();
                var oldSources = this._mediaElement.getElementsByTagName('source');
                var supportsTypeAttribute = this._supportsTypeAttribute();

                while (oldSources.length) {
                    device.removeElement(oldSources[0]);
                }
                for (var i = 0; i < sources.length; i++) {
                    var source = document.createElement('source');
                    if (supportsTypeAttribute) {
                        source.type = sources[i].getContentType();
                    }
                    //source.src = sources[i].getURL(tags);
                    source.src = sources[i].src;

                    device.appendChildElement(this._mediaElement, source);

                    (function(source) {
                        source._errorEventListener = function(evt) {
                            var errCode = self._mediaElement.error ? self._mediaElement.error.code : MediaInterface.MEDIA_ERR_UNKNOWN;
                            self._eventHandlingCallback(new MediaSourceErrorEvent(
                                self,
                                errCode,
                                source.src,
                                self._mediaElement.networkState === HTMLMediaElement.NETWORK_NO_SOURCE
                            ));
                            evt.stopPropagation();
                        };
                        source.addEventListener("error", source._errorEventListener, true);
                    })(source);
                }
            },
            getSources: function() {
                var sources = [];
                if(this.is_hls){
                    return [{src:this.src}];
                }
                if (this._mediaElement.src) {
                    sources.push(new MediaSource(this._mediaElement.src, this._mediaElement.type));
                } else {
                    var sourceElements = this._mediaElement.getElementsByTagName('source');
                    for (var i = 0; i < sourceElements.length; i++) {
                        sources.push(new MediaSource(sourceElements[i].src, sourceElements[i].type));
                    }
                }
                return sources;
            },
            // readonly attribute DOMString currentSrc;
            getCurrentSource: function() {
                // Some browsers URI encode apostrophes, others don't. Make sure they're all URI encoded.
                return this._mediaElement.currentSrc.replace(/'/g, "%27");
            },
            /*
               const unsigned short NETWORK_EMPTY = 0;
               const unsigned short NETWORK_IDLE = 1;
               const unsigned short NETWORK_LOADING = 2;
               const unsigned short NETWORK_NO_SOURCE = 3;
               readonly attribute unsigned short networkState;
               */
            getNetworkState: function() {
                return this._mediaElement.networkState;
            },
            // attribute DOMString preload;
            // @returns "none", "metadata" or "auto"
            getPreload: function() {
                return this._mediaElement.preload;
            },
            setPreload: function(preload) {
                this._mediaElement.preload = preload;
            },
            // readonly attribute TimeRanges buffered;
            getBuffered: function() {
                return this._mediaElement.buffered;
            },
            // void load();
            load: function() {
                //return this._mediaElement.load();
            },
            // DOMString canPlayType(in DOMString type);
            canPlayType: function(type) {
                return this._mediaElement.canPlayType(type);
            },
            /*
               const unsigned short HAVE_NOTHING = 0;
               const unsigned short HAVE_METADATA = 1;
               const unsigned short HAVE_CURRENT_DATA = 2;
               const unsigned short HAVE_FUTURE_DATA = 3;
               const unsigned short HAVE_ENOUGH_DATA = 4;
               readonly attribute unsigned short readyState;
               */
            getReadyState: function() {
                return this._mediaElement.readyState;
            },
            // readonly attribute boolean seeking;
            getSeeking: function() {
                return this._mediaElement.seeking;
            },
            // attribute double currentTime;
            setCurrentTime: function(currentTime) {
                if(this._mediaElement)
                    this._mediaElement.currentTime += currentTime;
            },
            getCurrentTime: function() {
                if(this._mediaElement)
                    return this._mediaElement.currentTime;
            },
            // readonly attribute double initialTime;
            getInitialTime: function() {
                if(this._mediaElement)
                    return this._mediaElement.initialTime;
            },
            // readonly attribute double duration;
            getDuration: function() {
                if(this._mediaElement)
                    return this._mediaElement.duration;
            },
            // readonly attribute Date startOffsetTime;
            getStartOffsetTime: function() {
                return this._mediaElement.startOffsetTime;
            },
            // readonly attribute boolean paused;
            getPaused: function() {
                return this._mediaElement.paused;
            },
            // attribute double defaultPlaybackRate;
            getDefaultPlaybackRate: function() {
                return this._mediaElement.defaultPlaybackRate;
            },
            // attribute double playbackRate;
            getPlaybackRate: function() {
                return this._mediaElement.playbackRate;
            },
            setPlaybackRate: function(playbackRate) {
                this._mediaElement.playbackRate = playbackRate;
            },
            // readonly attribute TimeRanges played;
            getPlayed: function() {
                return this._mediaElement.played;
            },
            // readonly attribute TimeRanges seekable;
            getSeekable: function() {
                return this._mediaElement.seekable;
            },
            // readonly attribute boolean ended;
            getEnded: function() {
                return this._mediaElement.ended;
            },
            // attribute boolean autoplay;
            getAutoPlay: function() {
                return this._mediaElement.autoplay;
            },
            setAutoPlay: function(autoplay) {
                this._mediaElement.autoplay = autoplay;
            },
            // attribute boolean loop;
            getLoop: function() {
                return this._mediaElement.loop;
            },
            setLoop: function(loop) {
                this._mediaElement.loop = loop;
            },
            // void play();
            play: function() {
                if(this.is_hls) return;
                //var s = this.getSources();
                //G.log("html5 play3: "+s[0].src);
                this._mediaElement.play();
            },
            stop: function() {
                this.pause();
            },
            // void pause();
            pause: function() {
                this._mediaElement.pause();
            },
            // attribute boolean controls;
            setNativeControls: function(controls) {
                this._mediaElement.controls = controls;
            },
            getNativeControls: function() {
                return this._mediaElement.controls;
            },
            destroy: function() {
                this.stop();
                if(this.is_hls){
                    this.hls.destroy();
                }
                var device = Application.getCurrentApplication().getDevice();
                device.removeElement(this._mediaElement);

                // Remove error event listeners from each source element
                var sourceElements = this._mediaElement.getElementsByTagName("source");

                // Loop through the array backwards as we remove array elements inside the loop body
                var sourceElementsLength = sourceElements.length;
                for (var sourceElementIndex = sourceElementsLength - 1; sourceElementIndex >= 0; sourceElementIndex--) {
                    var sourceElement = sourceElements[sourceElementIndex];
                    sourceElement.removeEventListener('error', sourceElement._errorEventListener, true);
                    device.removeElement(sourceElement);

                    delete sourceElements[sourceElementIndex];
                }

                sourceElements = null;


                // Remove event listeners
                for (var i = 0; i < MediaEvent.TYPES.length; i++) {
                    this._mediaElement.removeEventListener(MediaEvent.TYPES[i], this._eventWrapper, true);
                }
                this._mediaElement.removeEventListener("error", this._errorEventWrapper, true);

                // Trick to abort browser loading threads on certain webkit devices
                if(this._requiresWebkitMemoryLeakFix()) {
                    this.webkitMemoryLeakFix();
                }

                delete this._mediaElement;
                this._mediaElement = null;
                currentPlayer = null;
            },
            webkitMemoryLeakFix : function() {
                // http://stackoverflow.com/questions/5170398/ios-safari-memory-leak-when-loading-unloading-html5-video
                // Resetting source is also advised by HTML5 video spec, section 4.8.10.15:
                // http://www.w3.org/TR/2011/WD-html5-20110405/video.html#best-practices-for-authors-using-media-elements
                this._mediaElement.removeAttribute("src");
                this._mediaElement.load();
            }
        });

        Device.prototype.createMediaInterface = function(id, mediaType, eventCallback) {
            currentPlayer = new HTML5HLSPlayer(id, mediaType, eventCallback);
            return currentPlayer;
        };
        Device.prototype.getPlayerEmbedMode = function(mediaType) {
            //return MediaInterface.EMBED_MODE_EMBEDDED;   KDKD change for LG !
            return MediaInterface.EMBED_MODE_BACKGROUND;

        };
        /**
         * Check to see if volume control is supported on this device.
         * @returns Boolean true if volume control is supported.
         */
        Device.prototype.isVolumeControlSupported = function() {
            return true;
        };
        /**
         * Get the current volume.
         * @returns The current volume (0.0 to 1.0)
         */
        Device.prototype.getVolume = function() {
            if (currentPlayer) {
                return currentPlayer._mediaElement.volume;
            }
            return currentVolume;
        };
        /**
         * Set the current volume.
         * @param {Float} volume The new volume level (0.0 to 1.0).
         */
        Device.prototype.setVolume = function(volume,ui) {
            if (volume > 1.0) {
                this.getLogger().warn("HTML5 setVolume - Invalid volume specified (" + volume + " > 1.0). Clipped to 1.0");
                volume = 1.0;
            } else if (volume < 0.0) {
                this.getLogger().warn("HTML5 setVolume - Invalid volume specified (" + volume + " < 0.0). Clipped to 0.0");
                volume = 0;
            }
            currentVolume = volume;
            if (currentPlayer) {
                currentPlayer._mediaElement.volume = volume;
            }
        };
        /**
         * Check to see if the volume is currently muted.
         * @returns Boolean true if the device is currently muted. Otherwise false.
         */
        Device.prototype.getMuted = function() {
            if (currentPlayer) {
                return currentPlayer._mediaElement.muted;
            }
            return isMuted;
        };
        /**
         * Mute or unmute the device.
         * @param {Boolean} muted The new muted state. Boolean true to mute, false to unmute.
         */
        Device.prototype.setMuted = function(muted) {
            isMuted = muted;
            if (currentPlayer) {
                currentPlayer._mediaElement.muted = muted;
            }
        };
        return HTML5HLSPlayer;
    }
);
