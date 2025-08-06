console.clear();
var Stage = /** @class */ (function () {
    function Stage() {
        // container
        var _this = this;
        this.render = function () {
            this.renderer.render(this.scene, this.camera);
        };
        this.add = function (elem) {
            this.scene.add(elem);
        };
        this.remove = function (elem) {
            this.scene.remove(elem);
        };
        this.container = document.getElementById('game');
        // renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor('#D0CBC7', 1);
        this.container.appendChild(this.renderer.domElement);
        // scene
        this.scene = new THREE.Scene();
        // camera
        var aspect = window.innerWidth / window.innerHeight;
        var d = 20;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, -100, 1000);
        this.camera.position.x = 2;
        this.camera.position.y = 2;
        this.camera.position.z = 2;
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        //light
        this.light = new THREE.DirectionalLight(0xffffff, 0.5);
        this.light.position.set(0, 499, 0);
        this.scene.add(this.light);
        this.softLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.softLight);
        window.addEventListener('resize', function () { return _this.onResize(); });
        this.onResize();
    }
    Stage.prototype.setCamera = function (y, speed) {
        if (speed === void 0) { speed = 0.3; }
        TweenLite.to(this.camera.position, speed, { y: y + 4, ease: Power1.easeInOut });
        TweenLite.to(this.camera.lookAt, speed, { y: y, ease: Power1.easeInOut });
    };
    Stage.prototype.onResize = function () {
        var viewSize = 30;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.left = window.innerWidth / -viewSize;
        this.camera.right = window.innerWidth / viewSize;
        this.camera.top = window.innerHeight / viewSize;
        this.camera.bottom = window.innerHeight / -viewSize;
        this.camera.updateProjectionMatrix();
    };
    return Stage;
}());
var Block = /** @class */ (function () {
    function Block(block) {
        // set size and position
        this.STATES = { ACTIVE: 'active', STOPPED: 'stopped', MISSED: 'missed' };
        this.MOVE_AMOUNT = 12;
        this.dimension = { width: 0, height: 0, depth: 0 };
        this.position = { x: 0, y: 0, z: 0 };
        this.targetBlock = block;
        this.index = (this.targetBlock ? this.targetBlock.index : 0) + 1;
        this.workingPlane = this.index % 2 ? 'x' : 'z';
        this.workingDimension = this.index % 2 ? 'width' : 'depth';
        // set the dimensions from the target block, or defaults.
        this.dimension.width = this.targetBlock ? this.targetBlock.dimension.width : 10;
        this.dimension.height = this.targetBlock ? this.targetBlock.dimension.height : 2;
        this.dimension.depth = this.targetBlock ? this.targetBlock.dimension.depth : 10;
        this.position.x = this.targetBlock ? this.targetBlock.position.x : 0;
        this.position.y = this.dimension.height * this.index;
        this.position.z = this.targetBlock ? this.targetBlock.position.z : 0;
        this.colorOffset = this.targetBlock ? this.targetBlock.colorOffset : Math.round(Math.random() * 100);
        // set color
        if (!this.targetBlock) {
            this.color = 0x333344;
        }
        else {
            var offset = this.index + this.colorOffset;
            var r = Math.sin(0.3 * offset) * 55 + 200;
            var g = Math.sin(0.3 * offset + 2) * 55 + 200;
            var b = Math.sin(0.3 * offset + 4) * 55 + 200;
            this.color = new THREE.Color(r / 255, g / 255, b / 255);
        }
        // state
        this.state = this.index > 1 ? this.STATES.ACTIVE : this.STATES.STOPPED;
        // set direction with speed increase every 3 levels
        var level = this.index - 1; // Convert to 0-based level
        var speedIncreaseFactor = Math.floor(level / 3); // Increase every 3 levels
        this.speed = -0.1 - (this.index * 0.005) - (speedIncreaseFactor * 0.02);
        if (this.speed < -4)
            this.speed = -4;
        this.direction = this.speed;
        // create block
        var geometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
        this.material = new THREE.MeshToonMaterial({ color: this.color, shading: THREE.FlatShading });
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.set(this.position.x, this.position.y + (this.state == this.STATES.ACTIVE ? 0 : 0), this.position.z);
        if (this.state == this.STATES.ACTIVE) {
            this.position[this.workingPlane] = Math.random() > 0.5 ? -this.MOVE_AMOUNT : this.MOVE_AMOUNT;
        }
    }
    Block.prototype.reverseDirection = function () {
        this.direction = this.direction > 0 ? this.speed : Math.abs(this.speed);
    };
    Block.prototype.place = function () {
        this.state = this.STATES.STOPPED;
        var overlap = this.targetBlock.dimension[this.workingDimension] - Math.abs(this.position[this.workingPlane] - this.targetBlock.position[this.workingPlane]);
        var blocksToReturn = {
            plane: this.workingPlane,
            direction: this.direction
        };
        
        // Calculate precision metrics
        var maxPossibleOverlap = this.targetBlock.dimension[this.workingDimension];
        var overlapPercentage = Math.max(0, overlap / maxPossibleOverlap);
        blocksToReturn.overlapPercentage = overlapPercentage;
        blocksToReturn.precisionScore = Math.round(overlapPercentage * 1000); // 0-1000 points
        
        // Calculate area metrics
        var originalArea = this.dimension.width * this.dimension.depth;
        var placedArea = 0;
        var areaLost = 0;
        
        if (overlap > 0) {
            placedArea = this.workingDimension === 'width' ? 
                overlap * this.dimension.depth : 
                this.dimension.width * overlap;
            areaLost = originalArea - placedArea;
        } else {
            areaLost = originalArea; // Complete miss
        }
        
        blocksToReturn.originalArea = originalArea;
        blocksToReturn.placedArea = placedArea;
        blocksToReturn.areaLost = areaLost;
        blocksToReturn.areaEfficiency = originalArea > 0 ? (placedArea / originalArea) : 0;
        
        if (this.dimension[this.workingDimension] - overlap < 0.3) {
            overlap = this.dimension[this.workingDimension];
            blocksToReturn.bonus = true;
            blocksToReturn.isPerfect = true;
            blocksToReturn.precisionScore = 1000; // Perfect placement gets max points
            this.position.x = this.targetBlock.position.x;
            this.position.z = this.targetBlock.position.z;
            this.dimension.width = this.targetBlock.dimension.width;
            this.dimension.depth = this.targetBlock.dimension.depth;
        }
        if (overlap > 0) {
            var choppedDimensions = { width: this.dimension.width, height: this.dimension.height, depth: this.dimension.depth };
            choppedDimensions[this.workingDimension] -= overlap;
            this.dimension[this.workingDimension] = overlap;
            var placedGeometry = new THREE.BoxGeometry(this.dimension.width, this.dimension.height, this.dimension.depth);
            placedGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(this.dimension.width / 2, this.dimension.height / 2, this.dimension.depth / 2));
            var placedMesh = new THREE.Mesh(placedGeometry, this.material);
            var choppedGeometry = new THREE.BoxGeometry(choppedDimensions.width, choppedDimensions.height, choppedDimensions.depth);
            choppedGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(choppedDimensions.width / 2, choppedDimensions.height / 2, choppedDimensions.depth / 2));
            var choppedMesh = new THREE.Mesh(choppedGeometry, this.material);
            var choppedPosition = {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            };
            if (this.position[this.workingPlane] < this.targetBlock.position[this.workingPlane]) {
                this.position[this.workingPlane] = this.targetBlock.position[this.workingPlane];
            }
            else {
                choppedPosition[this.workingPlane] += overlap;
            }
            placedMesh.position.set(this.position.x, this.position.y, this.position.z);
            choppedMesh.position.set(choppedPosition.x, choppedPosition.y, choppedPosition.z);
            blocksToReturn.placed = placedMesh;
            if (!blocksToReturn.bonus)
                blocksToReturn.chopped = choppedMesh;
        }
        else {
            this.state = this.STATES.MISSED;
        }
        this.dimension[this.workingDimension] = overlap;
        return blocksToReturn;
    };
    Block.prototype.tick = function () {
        if (this.state == this.STATES.ACTIVE) {
            var value = this.position[this.workingPlane];
            if (value > this.MOVE_AMOUNT || value < -this.MOVE_AMOUNT)
                this.reverseDirection();
            this.position[this.workingPlane] += this.direction;
            this.mesh.position[this.workingPlane] = this.position[this.workingPlane];
        }
    };
    return Block;
}());
var Game = /** @class */ (function () {
    function Game() {
        var _this = this;
        this.STATES = {
            'LOADING': 'loading',
            'PLAYING': 'playing',
            'READY': 'ready',
            'ENDED': 'ended',
            'RESETTING': 'resetting'
        };
        this.blocks = [];
        this.state = this.STATES.LOADING;
        
        // Competition Metrics
        this.gameMetrics = {
            totalPrecisionScore: 0,
            perfectPlacements: 0,
            gameStartTime: 0,
            gameEndTime: 0,
            blockPlacementTimes: [],
            totalOverlapPercentage: 0,
            consecutiveSuccessStreak: 0,
            maxConsecutiveStreak: 0,
            averageReactionTime: 0,
            
            // Area-based metrics
            totalTowerArea: 0,
            initialBlockArea: 0,
            areaLossHistory: [],
            blockAreas: [],
            totalAreaLost: 0,
            minBlockArea: Infinity,
            maxBlockArea: 0
        };
        this.stage = new Stage();
        this.mainContainer = document.getElementById('container');
        this.scoreContainer = document.getElementById('score');
        this.startButton = document.getElementById('start-button');
        this.instructions = document.getElementById('instructions');
        this.scoreContainer.innerHTML = '0';
        this.newBlocks = new THREE.Group();
        this.placedBlocks = new THREE.Group();
        this.choppedBlocks = new THREE.Group();
        this.stage.add(this.newBlocks);
        this.stage.add(this.placedBlocks);
        this.stage.add(this.choppedBlocks);
        this.addBlock();
        this.tick();
        this.updateState(this.STATES.READY);
        document.addEventListener('keydown', function (e) {
            if (e.keyCode == 32)
                _this.onAction();
        });
        document.addEventListener('click', function (e) {
            _this.onAction();
        });
        document.addEventListener('touchstart', function (e) {
            e.preventDefault();
            // this.onAction();
            // ☝️ this triggers after click on android so you
            // insta-lose, will figure it out later.
        });
    }
    Game.prototype.updateState = function (newState) {
        for (var key in this.STATES)
            this.mainContainer.classList.remove(this.STATES[key]);
        this.mainContainer.classList.add(newState);
        this.state = newState;
    };
    Game.prototype.onAction = function () {
        switch (this.state) {
            case this.STATES.READY:
                this.startGame();
                break;
            case this.STATES.PLAYING:
                this.placeBlock();
                break;
            case this.STATES.ENDED:
                this.restartGame();
                break;
        }
    };
    Game.prototype.startGame = function () {
        if (this.state != this.STATES.PLAYING) {
            this.scoreContainer.innerHTML = '0';
            this.updateState(this.STATES.PLAYING);
            
            // Reset and start timing metrics
            this.gameMetrics = {
                totalPrecisionScore: 0,
                perfectPlacements: 0,
                gameStartTime: Date.now(),
                gameEndTime: 0,
                blockPlacementTimes: [],
                totalOverlapPercentage: 0,
                consecutiveSuccessStreak: 0,
                maxConsecutiveStreak: 0,
                averageReactionTime: 0,
                lastBlockTime: Date.now(),
                
                // Reset area-based metrics
                totalTowerArea: 0,
                initialBlockArea: 100, // 10x10 starting block
                areaLossHistory: [],
                blockAreas: [100], // Include base block
                totalAreaLost: 0,
                minBlockArea: 100,
                maxBlockArea: 100
            };
            
            this.addBlock();
        }
    };
    Game.prototype.restartGame = function () {
        var _this = this;
        this.updateState(this.STATES.RESETTING);
        var oldBlocks = this.placedBlocks.children;
        var removeSpeed = 0.2;
        var delayAmount = 0.02;
        var _loop_1 = function (i) {
            TweenLite.to(oldBlocks[i].scale, removeSpeed, { x: 0, y: 0, z: 0, delay: (oldBlocks.length - i) * delayAmount, ease: Power1.easeIn, onComplete: function () { return _this.placedBlocks.remove(oldBlocks[i]); } });
            TweenLite.to(oldBlocks[i].rotation, removeSpeed, { y: 0.5, delay: (oldBlocks.length - i) * delayAmount, ease: Power1.easeIn });
        };
        for (var i = 0; i < oldBlocks.length; i++) {
            _loop_1(i);
        }
        var cameraMoveSpeed = removeSpeed * 2 + (oldBlocks.length * delayAmount);
        this.stage.setCamera(2, cameraMoveSpeed);
        var countdown = { value: this.blocks.length - 1 };
        TweenLite.to(countdown, cameraMoveSpeed, { value: 0, onUpdate: function () { _this.scoreContainer.innerHTML = String(Math.round(countdown.value)); } });
        this.blocks = this.blocks.slice(0, 1);
        setTimeout(function () {
            _this.startGame();
        }, cameraMoveSpeed * 1000);
    };
    Game.prototype.placeBlock = function () {
        var _this = this;
        var currentBlock = this.blocks[this.blocks.length - 1];
        var placementTime = Date.now();
        var reactionTime = placementTime - this.gameMetrics.lastBlockTime;
        
        var newBlocks = currentBlock.place();
        this.newBlocks.remove(currentBlock.mesh);
        
        // Update metrics based on placement result
        if (newBlocks.overlapPercentage > 0) {
            // Successful placement
            this.gameMetrics.totalPrecisionScore += newBlocks.precisionScore;
            this.gameMetrics.totalOverlapPercentage += newBlocks.overlapPercentage;
            this.gameMetrics.blockPlacementTimes.push(reactionTime);
            this.gameMetrics.consecutiveSuccessStreak++;
            this.gameMetrics.maxConsecutiveStreak = Math.max(
                this.gameMetrics.maxConsecutiveStreak, 
                this.gameMetrics.consecutiveSuccessStreak
            );
            
            // Update area-based metrics
            this.gameMetrics.totalTowerArea += newBlocks.placedArea;
            this.gameMetrics.blockAreas.push(newBlocks.placedArea);
            this.gameMetrics.totalAreaLost += newBlocks.areaLost;
            this.gameMetrics.areaLossHistory.push(newBlocks.areaLost);
            this.gameMetrics.minBlockArea = Math.min(this.gameMetrics.minBlockArea, newBlocks.placedArea);
            this.gameMetrics.maxBlockArea = Math.max(this.gameMetrics.maxBlockArea, newBlocks.placedArea);
            
            if (newBlocks.isPerfect) {
                this.gameMetrics.perfectPlacements++;
            }
        } else {
            // Failed placement - reset streak and record total area loss
            this.gameMetrics.consecutiveSuccessStreak = 0;
            this.gameMetrics.totalAreaLost += newBlocks.originalArea;
            this.gameMetrics.areaLossHistory.push(newBlocks.originalArea);
        }
        
        this.gameMetrics.lastBlockTime = placementTime;
        if (newBlocks.placed)
            this.placedBlocks.add(newBlocks.placed);
        if (newBlocks.chopped) {
            this.choppedBlocks.add(newBlocks.chopped);
            var positionParams = { y: '-=30', ease: Power1.easeIn, onComplete: function () { return _this.choppedBlocks.remove(newBlocks.chopped); } };
            var rotateRandomness = 10;
            var rotationParams = {
                delay: 0.05,
                x: newBlocks.plane == 'z' ? ((Math.random() * rotateRandomness) - (rotateRandomness / 2)) : 0.1,
                z: newBlocks.plane == 'x' ? ((Math.random() * rotateRandomness) - (rotateRandomness / 2)) : 0.1,
                y: Math.random() * 0.1,
            };
            if (newBlocks.chopped.position[newBlocks.plane] > newBlocks.placed.position[newBlocks.plane]) {
                positionParams[newBlocks.plane] = '+=' + (40 * Math.abs(newBlocks.direction));
            }
            else {
                positionParams[newBlocks.plane] = '-=' + (40 * Math.abs(newBlocks.direction));
            }
            TweenLite.to(newBlocks.chopped.position, 1, positionParams);
            TweenLite.to(newBlocks.chopped.rotation, 1, rotationParams);
        }
        this.addBlock();
    };
    Game.prototype.addBlock = function () {
        var lastBlock = this.blocks[this.blocks.length - 1];
        if (lastBlock && lastBlock.state == lastBlock.STATES.MISSED) {
            return this.endGame();
        }
        this.scoreContainer.innerHTML = String(this.blocks.length - 1);
        var newKidOnTheBlock = new Block(lastBlock);
        this.newBlocks.add(newKidOnTheBlock.mesh);
        this.blocks.push(newKidOnTheBlock);
        this.stage.setCamera(this.blocks.length * 2);
        if (this.blocks.length >= 5)
            this.instructions.classList.add('hide');
    };
    Game.prototype.endGame = function () {
        this.gameMetrics.gameEndTime = Date.now();
        var totalGameTime = this.gameMetrics.gameEndTime - this.gameMetrics.gameStartTime;
        
        // Calculate final metrics
        var successfulPlacements = this.gameMetrics.blockPlacementTimes.length;
        this.gameMetrics.averageReactionTime = successfulPlacements > 0 ? 
            this.gameMetrics.blockPlacementTimes.reduce(function(a, b) { return a + b; }, 0) / successfulPlacements : 0;
        
        // Calculate area-based final metrics
        var totalPossibleArea = this.gameMetrics.initialBlockArea * this.blocks.length;
        var areaRetentionRate = totalPossibleArea > 0 ? 
            (this.gameMetrics.totalTowerArea / totalPossibleArea) : 0;
        var averageAreaLoss = this.gameMetrics.areaLossHistory.length > 0 ? 
            this.gameMetrics.totalAreaLost / this.gameMetrics.areaLossHistory.length : 0;
        var areaConsistency = this.calculateAreaConsistency();
        var finalBlockArea = this.gameMetrics.blockAreas.length > 1 ? 
            this.gameMetrics.blockAreas[this.gameMetrics.blockAreas.length - 1] : 0;
        
        // Create comprehensive score object for competition ranking
        var finalScore = {
            level: this.blocks.length - 1,
            totalPrecisionScore: this.gameMetrics.totalPrecisionScore,
            averagePrecision: successfulPlacements > 0 ? 
                (this.gameMetrics.totalOverlapPercentage / successfulPlacements * 100).toFixed(2) : 0,
            perfectPlacements: this.gameMetrics.perfectPlacements,
            totalGameTime: totalGameTime,
            averageReactionTime: Math.round(this.gameMetrics.averageReactionTime),
            maxConsecutiveStreak: this.gameMetrics.maxConsecutiveStreak,
            efficiency: successfulPlacements > 0 ? 
                ((successfulPlacements / (this.blocks.length - 1)) * 100).toFixed(1) : 0,
            
            // Area-based metrics
            totalTowerArea: Math.round(this.gameMetrics.totalTowerArea),
            areaRetentionRate: (areaRetentionRate * 100).toFixed(1),
            totalAreaLost: Math.round(this.gameMetrics.totalAreaLost),
            averageAreaLoss: Math.round(averageAreaLoss),
            minBlockArea: Math.round(this.gameMetrics.minBlockArea),
            finalBlockArea: Math.round(finalBlockArea),
            areaConsistency: areaConsistency.toFixed(2),
            areaEfficiencyScore: Math.round(areaRetentionRate * 1000) // 0-1000 points
        };
        
        // Store in localStorage for competition tracking
        localStorage.setItem('towerBlockCompetitionScore', JSON.stringify(finalScore));
        
        // Log detailed metrics for competition organizers
        console.log('=== COMPETITION METRICS ===');
        console.log('Final Level:', finalScore.level);
        console.log('Total Precision Score:', finalScore.totalPrecisionScore);
        console.log('Average Precision:', finalScore.averagePrecision + '%');
        console.log('Perfect Placements:', finalScore.perfectPlacements);
        console.log('Game Duration:', (finalScore.totalGameTime / 1000).toFixed(1) + 's');
        console.log('Average Reaction Time:', finalScore.averageReactionTime + 'ms');
        console.log('Max Consecutive Streak:', finalScore.maxConsecutiveStreak);
        console.log('Efficiency:', finalScore.efficiency + '%');
        console.log('--- AREA METRICS ---');
        console.log('Total Tower Area:', finalScore.totalTowerArea);
        console.log('Area Retention Rate:', finalScore.areaRetentionRate + '%');
        console.log('Total Area Lost:', finalScore.totalAreaLost);
        console.log('Average Area Loss:', finalScore.averageAreaLoss);
        console.log('Minimum Block Area:', finalScore.minBlockArea);
        console.log('Final Block Area:', finalScore.finalBlockArea);
        console.log('Area Consistency:', finalScore.areaConsistency);
        console.log('Area Efficiency Score:', finalScore.areaEfficiencyScore);
        console.log('========================');
        
        // Display metrics in game over screen
        var metricsContainer = document.getElementById('competition-metrics');
        if (metricsContainer) {
            // Calculate performance badges
            var badges = [];
            if (finalScore.level >= 20) badges.push('🏆 Master Builder');
            if (finalScore.perfectPlacements >= 5) badges.push('🎯 Perfect Precision');
            if (parseFloat(finalScore.areaRetentionRate) >= 80) badges.push('💎 Area Expert');
            if (finalScore.maxConsecutiveStreak >= 10) badges.push('🔥 Streak Master');
            if (finalScore.averageReactionTime <= 800) badges.push('⚡ Lightning Fast');
            
            var badgeDisplay = badges.length > 0 ? 
                '<div class="section-header">Achievements</div>' +
                badges.map(function(badge) { 
                    return '<div class="badge">' + badge + '</div>'; 
                }).join('') : '';
            
            metricsContainer.innerHTML = 
                badgeDisplay +
                '<div class="section-header">📊 Core Metrics</div>' +
                '<div class="highlight-metric">' +
                    '<div class="metric-row"><span>🏗️ Final Level</span><span>' + finalScore.level + '</span></div>' +
                '</div>' +
                '<div class="metric-row"><span>🎯 Precision Score</span><span>' + finalScore.totalPrecisionScore + '</span></div>' +
                '<div class="metric-row"><span>📈 Average Accuracy</span><span>' + finalScore.averagePrecision + '%</span></div>' +
                '<div class="metric-row"><span>💯 Perfect Placements</span><span>' + finalScore.perfectPlacements + '</span></div>' +
                
                '<div class="section-header">📐 Area Performance</div>' +
                '<div class="metric-row"><span>🏢 Tower Area</span><span>' + finalScore.totalTowerArea + '</span></div>' +
                '<div class="metric-row"><span>💾 Area Retention</span><span>' + finalScore.areaRetentionRate + '%</span></div>' +
                '<div class="metric-row"><span>🧩 Final Block Area</span><span>' + finalScore.finalBlockArea + '</span></div>' +
                '<div class="metric-row"><span>⚖️ Area Consistency</span><span>' + finalScore.areaConsistency + '</span></div>' +
                
                '<div class="section-header">⏱️ Timing & Efficiency</div>' +
                '<div class="metric-row"><span>🕐 Game Duration</span><span>' + (finalScore.totalGameTime / 1000).toFixed(1) + 's</span></div>' +
                '<div class="metric-row"><span>⚡ Avg Reaction Time</span><span>' + finalScore.averageReactionTime + 'ms</span></div>' +
                '<div class="metric-row"><span>🔥 Max Streak</span><span>' + finalScore.maxConsecutiveStreak + '</span></div>';
        }
        
        this.updateState(this.STATES.ENDED);
    };
    Game.prototype.calculateAreaConsistency = function () {
        var areas = this.gameMetrics.blockAreas;
        if (areas.length < 2) return 0;
        
        var mean = areas.reduce(function(sum, area) { return sum + area; }, 0) / areas.length;
        var squaredDiffs = areas.map(function(area) { return Math.pow(area - mean, 2); });
        var variance = squaredDiffs.reduce(function(sum, diff) { return sum + diff; }, 0) / areas.length;
        var standardDeviation = Math.sqrt(variance);
        
        // Return inverse of coefficient of variation (lower variation = higher consistency)
        var coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;
        return Math.max(0, 1 - coefficientOfVariation) * 100; // 0-100 scale
    };
    Game.prototype.tick = function () {
        var _this = this;
        this.blocks[this.blocks.length - 1].tick();
        this.stage.render();
        requestAnimationFrame(function () { _this.tick(); });
    };
    return Game;
}());

// Competition utility functions
function getCompetitionScore() {
    var stored = localStorage.getItem('towerBlockCompetitionScore');
    return stored ? JSON.parse(stored) : null;
}

function rankPlayers(players) {
    // Comprehensive ranking algorithm for competition with area metrics
    return players.sort(function(a, b) {
        // Primary: Level (higher is better)
        if (a.level !== b.level) return b.level - a.level;
        
        // Tie-breaker 1: Total Precision Score (higher is better)
        if (a.totalPrecisionScore !== b.totalPrecisionScore) 
            return b.totalPrecisionScore - a.totalPrecisionScore;
        
        // Tie-breaker 2: Area Efficiency Score (higher is better)
        if (a.areaEfficiencyScore !== b.areaEfficiencyScore) 
            return b.areaEfficiencyScore - a.areaEfficiencyScore;
        
        // Tie-breaker 3: Total Tower Area (higher is better)
        if (a.totalTowerArea !== b.totalTowerArea) 
            return b.totalTowerArea - a.totalTowerArea;
        
        // Tie-breaker 4: Perfect Placements (higher is better)
        if (a.perfectPlacements !== b.perfectPlacements) 
            return b.perfectPlacements - a.perfectPlacements;
        
        // Tie-breaker 5: Final Block Area (higher is better - shows endgame skill)
        if (a.finalBlockArea !== b.finalBlockArea) 
            return b.finalBlockArea - a.finalBlockArea;
        
        // Tie-breaker 6: Area Consistency (higher is better)
        if (a.areaConsistency !== b.areaConsistency) 
            return b.areaConsistency - a.areaConsistency;
        
        // Tie-breaker 7: Average Precision (higher is better)
        if (a.averagePrecision !== b.averagePrecision) 
            return b.averagePrecision - a.averagePrecision;
        
        // Tie-breaker 8: Game Duration (lower is better for same level)
        if (a.totalGameTime !== b.totalGameTime) 
            return a.totalGameTime - b.totalGameTime;
        
        // Tie-breaker 9: Average Reaction Time (lower is better)
        if (a.averageReactionTime !== b.averageReactionTime) 
            return a.averageReactionTime - b.averageReactionTime;
        
        // Tie-breaker 10: Max Consecutive Streak (higher is better)
        return b.maxConsecutiveStreak - a.maxConsecutiveStreak;
    });
}

var game = new Game();