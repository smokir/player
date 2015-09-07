(function (app) {
    app.AudioContext = new AudioContext();

    app.Player = function () {
        var self = this;

        self.context = app.AudioContext;
        self.gainNode = self.context.createGain();
        self.currentTrack = ko.observable();
        self.isPlaying = ko.observable(false);

        self.analyser = self.context.createAnalyser();
        self.analyser.fftSize = 256;
        self.canvasCtx = (document.getElementsByClassName("player__canvas")[0]).getContext("2d");

        self.initDragAndDrop();
    };

    app.Player.prototype.open = function (file) {
        var self = this,
            reader = new FileReader(),
            context = app.AudioContext,
            tags,
            cover, base64String, coverUrl,
            track;

        ID3.loadTags(file, function () {
            tags = ID3.getAllTags(file);

            if (tags.picture) {
                cover = tags.picture;
                for (var i = 0; i < cover.data.length; i++) {
                    base64String += String.fromCharCode(cover.data[i]);
                }

                coverUrl = "data:" + cover.format + ";base64," + window.btoa(base64String);
            }
            else {
                coverUrl = "images/unknown.png"
            }

            track = {
                loaded: ko.observable(false),
                name: file.name,
                artist: tags.artist || "unknown",
                title: tags.title || "unknown",
                cover: coverUrl,
            }

            reader.onload = function () {
                context.decodeAudioData(reader.result, function (audio) {
                    track.loaded(true);
                    track.audio = audio;
                });

                self.currentTrack(track);
            };

            reader.readAsArrayBuffer(file);
        },
            {
                tags: ["artist", "title", "cover"],
                dataReader: FileAPIReader(file)
            });
    };

    app.Player.prototype.play = function () {
        var self = this;

        if (self.currentTrack().loaded()) {
            self.source = self.context.createBufferSource();
            self.source.buffer = self.currentTrack().audio;
            self.source.connect(self.analyser);
            self.source.connect(self.gainNode);
            self.gainNode.connect(self.context.destination);
            self.source.start(0);
            self.isPlaying(true);
            self.visualize();
        }
    }

    app.Player.prototype.stop = function () {
        var self = this;

        self.source.stop();
        self.isPlaying(false);
    }

    app.Player.prototype.initDragAndDrop = function () {
        var self = this;

        document.getElementsByClassName("player__drag")[0].addEventListener('drop', function (e) {
            var files = e.dataTransfer.files;

            if (e.preventDefault) {
                e.preventDefault();
            }

            for (var key in files) {
                if (typeof (files[key]) == 'object' && files[key].type.indexOf('audio') > -1) {
                    self.open(files[key]);
                }
            };

            return false;
        });

        document.getElementsByClassName("player__drag")[0].addEventListener('dragover', function (e) {
            if (e.preventDefault) {
                e.preventDefault();
            }

            e.dataTransfer.dropEffect = 'copy';

            return false;
        });
    }

    app.Player.prototype.visualize = function () {
        var self = this,
            bufferLength = self.analyser.frequencyBinCount,
            dataArray = new Uint8Array(bufferLength),
            WIDTH = self.canvasCtx.canvas.width,
            HEIGHT = self.canvasCtx.canvas.height;

        var draw = function () {
            var barWidth = (WIDTH / bufferLength) * 2.5,
                barHeight,
                drawVisual,
                x = 0;

            if (self.isPlaying()) {
                drawVisual = requestAnimationFrame(draw);

                self.analyser.getByteFrequencyData(dataArray);
                self.canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
                for (var i = 0; i < bufferLength; i++) {
                    barHeight = dataArray[i] / 2;

                    self.canvasCtx.fillStyle = 'rgb(255,0,0)';
                    self.canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2);

                    x += barWidth + 1;
                }
            }
            else {
                for (var i = 0; i < bufferLength; i++) {
                    self.canvasCtx.fillStyle = 'rgb(255,0,0)';
                    self.canvasCtx.fillRect(x, 0, barWidth, 0);

                    x += barWidth + 1;
                }
            }
        };

        draw();
    }

} (window.app = window.app || {}));