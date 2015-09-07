(function (app) {
    app.AudioContext = new AudioContext();

    app.Player = function () {
        var self = this;
        
        self.initDragDrop();
        
        self.tracks = ko.observableArray();;
        self.currentTrack = ko.observable();
    };

    app.Player.prototype.open = function (files) {
        var self = this;
        
        function open(file) {
            var reader = new FileReader(),
                audioContext = app.AudioContext,
                tags,
                picture,
                base64String = "",
                pictureUrl,
                track;
            
            ID3.loadTags(file, function () {
                tags = ID3.getAllTags(file);

                if (tags.picture) {
                    picture = tags.picture;
                    for (var i = 0; i < picture.data.length; i++) {
                        base64String += String.fromCharCode(picture.data[i]);
                    }

                    pictureUrl = "data:" + picture.format + ";base64," + window.btoa(base64String);
                }
                else {
                    pictureUrl = "images/defaultPicture.png"
                }

                track = {
                    loaded: ko.observable(false),
                    name: file.name,
                    artist: tags.artist || "unknown",
                    title: tags.title || "unknown",
                    album: tags.album || "unknown",
                    year: tags.year,
                    picture: pictureUrl,
                }

                reader.onload = function () {
                    audioContext.decodeAudioData(reader.result, function (audio) {
                        track.loaded(true);
                        track.audio = audio;
                    });

                    self.tracks.push(track);
                };

                reader.readAsArrayBuffer(file);
            },
                {
                    tags: ["artist", "title", "album", "year", "picture"],
                    dataReader: FileAPIReader(file)
                });
        }

        for (var i = 0; i < files.length; i++) {
            open(files[i]);
        }
    };
    
    app.Player.prototype.initDragDrop = function () {
        var self = this;
        
        var jsDrop = document.getElementsByClassName("js-drop")[0];
        
        jsDrop.addEventListener("dragenter", function (e) {
            this.classList.add("player__drop_overlay");
        });

        jsDrop.addEventListener('dragleave', function (e) {
            this.classList.remove("player__drop_overlay");
        });

        jsDrop.addEventListener('drop', function (e) {
            if (e.preventDefault) {
                e.preventDefault();
            }

            this.classList.remove("player__drop_overlay");

            self.open(e.dataTransfer.files);
        });

        jsDrop.addEventListener('dragover', function (e) {
            if (e.preventDefault) {
                e.preventDefault();
            }

            e.dataTransfer.dropEffect = 'copy';

            return false;
        });
    };

} (window.app = window.app || {}));