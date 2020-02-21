(function () {
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    var player = {};
    var ground = [];
    var platformWidth = 32;
    var platformHeight = canvas.height - platformWidth * 4;

    /* Request Animation Polyfill */
    var requestAnimFrame = (function() {
        return  window.requestAnimationFrame        ||
                window.webkitRequestAnimationFrame  ||
                window.mozRequestAnimationFrame     ||
                window.oRequestAnimationFrame       ||
                window.msRequestAnimationFrame      ||
                function(callback, element) {
                    window.setTimeout(callback, 1000 / 60);
                };
    })();

    var assetLoader = (function() {
        // images dictionary
        this.imgs        = {
            "bg"            : "imgs/bg.png",
            "sky"           : "imgs/sky.png",
            "backdrop"      : "imgs/backdrop.png",
            "backdrop2"     : "imgs/backdrop_ground.png",
            "grass"         : "imgs/grass.png",
            "avatar_normal" : "imgs/normal_walk.png",
            "water"         : "imgs/water.png",
            "grass1"        : "imgs/grassMid1.png",
            "grass2"        : "imgs/grassMid2.png",
            "bridge"        : "imgs/bridge.png",
            "plant"         : "imgs/plant.png",
            "bush1"         : "imgs/bush1.png",
            "bush2"         : "imgs/bush2.png",
            "cliff"         : "imgs/grassCliffRight.png",
            "spikes"        : "imgs/spikes.png",
            "box"           : "imgs/boxCoin.png",
            "slime"         : "imgs/slime.png"
        };
    
        var assetsLoaded = 0;                                // how many assets have been loaded
        var numImgs      = Object.keys(this.imgs).length;    // total number of image assets
        this.totalAssest = numImgs;                          // total number of assets
    
        /**
         * Ensure all assets are loaded before using them
         * @param {number} dic  - Dictionary name ('imgs', 'sounds', 'fonts')
         * @param {number} name - Asset name in the dictionary
         */
        function assetLoaded(dic, name) {
          // don't count assets that have already loaded
          if (this[dic][name].status !== 'loading') {
            return;
          }
    
          this[dic][name].status = 'loaded';
          assetsLoaded++;
    
          // finished callback
          if (assetsLoaded === this.totalAssest && typeof this.finished === 'function') {
            this.finished();
          }
        }
    
        /**
         * Create assets, set callback for asset loading, set asset source
         */
        this.downloadAll = function() {
          var _this = this;
          var src;
    
          // load images
          for (var img in this.imgs) {
            if (this.imgs.hasOwnProperty(img)) {
              src = this.imgs[img];
    
              // create a closure for event binding
              (function(_this, img) {
                _this.imgs[img] = new Image();
                _this.imgs[img].status = 'loading';
                _this.imgs[img].name = img;
                _this.imgs[img].onload = function() { assetLoaded.call(_this, 'imgs', img) };
                _this.imgs[img].src = src;
              })(_this, img);
            }
          }
        }
    
        return {
          imgs: this.imgs,
          totalAssest: this.totalAssest,
          downloadAll: this.downloadAll
        };
      })();

    assetLoader.finished = function() {
        startGame();
    }

    /* Creates a Spritesheet */

    function SpriteSheet(path, frameWidth, frameHeight) {
        this.image = new Image();
        this.frameWidth = frameWidth;
        this.frameHeight = frameHeight;

        var self = this;
        this.image.onload = function() {
            self.framesPerRow = Math.floor(self.image.width / self.frameWidth);
        };
        this.image.src = path;
    }

    function Animation(spritesheet, frameSpeed, startFrame, endFrame) {
        var animationSequence = [];
        var currentFrame = 0;
        var counter = 0;

        for (var frameNumber = startFrame; frameNumber <= endFrame; frameNumber++) {
            animationSequence.push(frameNumber)
        }

        this.update = function() {
            if (counter == (frameSpeed - 1)) {
                currentFrame = (currentFrame + 1) % animationSequence.length;
            }

            counter = (counter + 1) % frameSpeed;
        };

        this.draw = function(x, y) {
            var row = Math.floor(animationSequence[currentFrame] / spritesheet.framesPerRow);
            var col = Math.floor(animationSequence[currentFrame] % spritesheet.framesPerRow);

            ctx.drawImage(
                spritesheet.image,
                col * spritesheet.frameWidth, row * spritesheet.frameHeight,
                spritesheet.frameWidth, spritesheet.frameHeight,
                x, y,
                spritesheet.frameWidth, spritesheet.frameHeight
            );
        }

    }

    /* Create paralax */

    var background = (function() {
        var sky = {};
        var backdrop = {};
        var backdrop2 = {};

        this.draw = function() {
            ctx.drawImage(assetLoader.imgs.bg, 0, 0);

            sky.x -= sky.speed;
            backdrop.x -= backdrop.speed;
            backdrop2.x -= backdrop2.speed;

            ctx.drawImage(assetLoader.imgs.sky, sky.x, sky.y);
            ctx.drawImage(assetLoader.imgs.sky, sky.x + canvas.width, sky.y);
            ctx.drawImage(assetLoader.imgs.backdrop, backdrop.x, backdrop.y);
            ctx.drawImage(assetLoader.imgs.backdrop, backdrop.x + canvas.width, backdrop.y);
            ctx.drawImage(assetLoader.imgs.backdrop2, backdrop2.x, backdrop2.y);
            ctx.drawImage(assetLoader.imgs.backdrop2, backdrop2.x + canvas.width, backdrop2.y);

            if (sky.x + assetLoader.imgs.sky.width <= 0)
                sky.x = 0;
            if (backdrop.x + assetLoader.imgs.backdrop.width <= 0)
                backdrop.x = 0;
            if (backdrop2.x + assetLoader.imgs.backdrop2.width <= 0)
                backdrop2.x = 0;
        };

        this.reset = function() {
            sky.x = 0;
            sky.y = 0;
            sky.speed = 0.2;
            backdrop.x = 0;
            backdrop.y = 0;
            backdrop.speed = 0.4;
            backdrop2.x = 0;
            backdrop2.y = 0;
            backdrop2.speed = 0.6;
        }

        return {
            draw: this.draw,
            reset: this.reset
        };
    })();

    function Vector(x, y, dx, dy) {
        this.x = x || 0;
        this.y = y || 0;
        this.dx = dx || 0;
        this.dy = dy || 0;
    }

    Vector.prototype.advance = function () {
        this.x += this.dx;
        this.y += this.dy;
    }

    Vector.prototype.minDist = function (vec) {
        var minDist = Infinity;
        var max = Math.max( Math.ads(this.dx), Math.ads(this.dy), Math.ads(vec.dx), Math.ads(vec.dy) );
        var slice = 1 / max;
        var x, y, distSquared;
        var vec1 = {}, vec2 = {};
        vec1.x = this.x + this.width/2;
        vec1.y = this.y + this.height/2;
        vec2.x = vec.x + vec.width/2;
        vec2.y = vec.y + vec.height/2;
        for (var percent = 0; percent < 1; percent += slice) {
            x = (vec1.x + this.dx * percent) - (vec2.x + vec.dx * percent);
            y = (vec1.y + this.dy * percent) - (vec2.y + vec.dy * percent);
            distSquared = x * x + y * y;
            minDist = Math.min(minDist, distSquared);
        }
        return Math.min(minDist, distSquared);
    };

    var player = (function (player) {
        player.width = 60;
        player.height = 96;
        player.speed = 6;
        // jumping
        player.gravity = 1;
        player.dy = 0;
        player.jumpDy = -10;
        player.isFalling = false;
        player.isJumping = false;
        // sprite
        player.sheet = new SpriteSheet("imgs/normal_walk.png", player.width, player.height);
        player.walkAnim = new Animation(player.sheet, 4, 0, 15);
        player.jumpAnim = new Animation(player.sheet, 4, 15,15);
        player.fallAnim = new Animation(player.sheet, 4, 11, 11);
        player.anim = player.walkAnim;
        Vector.call(player, 0, 0, 0, player.dy);
        var jumpCounter = 0;
        //Update
        player.update = function () {
            if (KEY_STATUS.space && player.dy === 0 && !player.isJumping) {
                player.isJumping = true;
                player.dy = player.jumpDy;
                jumpCounter = 12;
            };
            if (KEY_STATUS.space && jumpCounter) {
                player.dy = player.jumpDy;
            }
            jumpCounter = Math.max(jumpCounter-1, 0)
            this.advance();

            if (player.isFalling || player.isJumping) {
                player.dy += player.gravity;
            }

            if (player.dy > 0) {
                player.anim = player.fallAnim;
            }
            else if (player.dy < 0) {
                player.anim = player.jumpAnim;
            }
            else {
                player.anim = player.walkAnim;
            }
            player.anim.update();
        };

        player.draw = function () {
            player.anim.draw(player.x, player.y);
        }

        player.reset = function () {
            player.x = 64;
            player.y = 250;
        };

        return player;

    })(Object.create(Vector.prototype));

    var KEY_CODES = {
        32: "space"
    };

    var KEY_STATUS = {};
    for (var code in KEY_CODES) {
        if (KEY_CODES.hasOwnProperty(code)) {
            KEY_STATUS[KEY_CODES[code]] = false;
        }
    }
    document.onkeydown = function (e) {
        var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
        if (KEY_CODES[keyCode]) {
            e.preventDefault();
            KEY_STATUS[KEY_CODES[keyCode]] = true;
        }
    }
    document.onkeyup = function(e) {
        var keyCode = (e.keyCode) ? e.keyCode : e.charCode;
        if (KEY_CODES[keyCode]) {
            e.preventDefault();
            KEY_STATUS[KEY_CODES[keyCode]] = false;
        }
    };

    function Sprite(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = platformWidth;
        this.height = platformHeight;
        this.type = type;
        Vector.call(this, x, y, 0, 0);

        this.update = function () {
            this.dx = -player.speed;
            this.advance();
        }
        this.draw = function () {
            ctx.drawImage(assetLoader.imgs[this.type], this.x, this.y);
        };
    }
    Sprite.prototype = Object.create(Vector.prototype);


    function rand(low, high) {
        return Math.floor( Math.random() * (high - low + 1) + low );
    };

    function bound(num, low, high) {
        return Math.max( Math.min(num, high), low );
    }

    function spawnSprites() {
        score++;
        if (gapLength > 0) {
            gapLength -= 1;
        }

        else if (platformLength > 0) {
            var type = getType();
            ground.push(new Sprite(
                canvas.width + platformWidth % player.speed,
                platformBase - platformHeight * platformSpacer,
                type
            ));
            platformLength -= 1;
            spawnEnviromentSprites();
            spawnEnemySprites();
        }

        else {
            gapLength = rand(player.speed - 2, player.speed);
            platformHeight = bound(rand(0, platformHeight + rant(0, 2)), 0, 4);
            platformLength = rand(Math.floor(player.speed/2), player.speed * 4);
        }
    }

    function getType() {
        var type;
        switch (platformHeight) {
            case 0:
            case 1:
                type = Math.random() > 0.5 ? "grass" : "grass2";
                break;
            case 2:
                type = "grass";
                break;
            case 3:
                type = "bridge";
                break;
            case 4:
                type = "box";
                break;
        };
        if (platformLength === 1 && platformWidth < 3 && rand(0, 3) === 0) {
            type = "cliff";
        }
        return type;
    }

    function spawnEnviromentSprites() {
        if(score > 40 && rand(0, 20) === 0 && platformWidth < 3) {
            if (Math.random() > 0.5) {
                enviroment.push(new Sprite(
                    canvas.width + platformWidth % player.speed,
                    platformBase - platformHeight * platformSpacer - platformWidth,
                    'plant'
                ))
            }
            else if (platformLength > 2) {
                environment.push(new Sprite(
                    canvas.width + platformWidth % player.speed,
                    platformBase - platformHeight * platformSpacer - platformWidth,
                    'bush1'
                ));
                environment.push(new Sprite(
                    canvas.width + platformWidth % player.speed + platformWidth,
                    platformBase - platformHeight * platformSpacer - platformWidth,
                    'bush2'
                ));
            }
        }
    }

    function spawnEnemySprites() {
        if (score > 100 && Math.random() > 0.96 && enemies.length < 3 && platformLength > 5 &&
            (enemies.length ? canvas.width - enemies[enemies.length-1].x >= platformWidth * 3 ||
                canvas.width - enemies[enemies.length-1].x < platformWidth : true)) {
            enemies.push(new Sprite(
                canvas.width + platformWidth % player.speed,
                platformBase - platformHeight * platformSpacer - platformWidth,
                Math.random() > 0.5 ? 'spikes' : 'slime'
            ));
        }
    }

    function updateWater() {
        for (var i = 0; i < water.length; i++) {
            water[i].update();
            water[i].draw();
        }

        if (water[0] && water[0].x < -platformWidth) {
            var w = water.splice(0, 1)[0];
            w.x = water[water.length-1].x + platformWidth;
            water.push(w);
        }
    }


    /**/
    function startGame() {
        player.width = 60;
        player.height = 96;
        player.speed = 6;
        player.sheet = new SpriteSheet("imgs/normal_walk.png", player.width, player.height);
        player.anim = new Animation(player.sheet, 4, 0, 15);

        for (i = 0, length = Math.floor(canvas.width / platformWidth) + 1; i < length; i++) {
            ground[i] = {"x": i * platformWidth, "y": platformHeight};
        }
        background.reset();
        animate();
    }

    function animate() {
        requestAnimFrame( animate );
        background.draw();
        for (i = 0; i < ground.length; i++) {
            ground[i].x -= player.speed;
            ctx.drawImage(assetLoader.imgs.grass, ground[i].x, ground[i].y);
        }
        if (ground[0].x <= -platformWidth) {
            ground.shift();
            ground.push({"x": ground[ground.length-1].x + platformWidth, "y": platformHeight});
        }
        player.anim.update();
        player.anim.draw(64, 260);
    }

    assetLoader.downloadAll();


})();



