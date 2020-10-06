var config = {
  type: Phaser.AUTO,
  parent: "phaser-example",
  width: 800,
  height: 800,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: "#444444",
  scene: {
    create: create,
    update: update,
  },
  stencil: false, // might save us some CPU/GPU?
};

const clamp_val = 8 + 270; // degrees
const clamp_rad = Phaser.Math.DegToRad(clamp_val);
const clamp_trial = Array(5)
  .fill(0)
  .concat(Array(10).fill(1))
  .concat(Array(10).fill(0));
// const clamp_trial = Array(5).fill(0);

let trial_counter = 0;
let log = false;
let trials = [];
const neutral = 0xaaaaaa;
const go = 0x22ee22;

function clamp(x, low, high) {
  return Math.min(Math.max(x, low), high);
}

function create() {
  this.cameras.main.setBounds(
    -config.width / 2,
    -config.height / 2,
    config.width,
    config.height
  );

  this.add.circle(0, 0, 20, 0x6666ff); // origin
  this.origin = new Phaser.Geom.Circle(0, 0, 20);
  this.target = this.add.circle(0, -300, 30, neutral);

  this.user = this.add.circle(-50, -50, 10, 0xffffff);
  this.input.setPollAlways();

  var data = [0, 20, 84, 20, 84, 0, 120, 50, 84, 100, 84, 80, 0, 80];

  this.guide = this.add.polygon(0, -100, data, 0xff33cc).setScale(-0.7, 0.5);
  this.guide.visible = false;

  this.txt = this.add
    .text(0, -200, "Click to start.", {
      fontSize: 120,
      fontFamily: "Arial",
    })
    .setOrigin(0.5, 0.5);

  this.instr = this.add
    .text(
      0,
      200,
      "Move to the circle in the center.\nWhen the target turns green,\nignore the cursor and reach\nstraight through the target.",
      {
        fontSize: 30,
        fontStyle: "bold",
        align: "center",
      }
    )
    .setOrigin(0.5, 0.5);

  this.done = this.add
    .text(0, 0, "All done!", {
      fontSize: 150,
      fontStyle: "bold",
      fontFamily: "Arial",
      align: "center",
    })
    .setOrigin(0.5, 0.5);
  this.done.visible = false;

  this.input.on(
    "pointerdown",
    function (pointer) {
      this.input.mouse.requestPointerLock();
    },
    this
  );

  // actual mouse position
  this.raw_x = -50;
  this.raw_y = -50;
  this.clamped = false;
  this.last_clamped = false;
  this.reference_time = performance.now();

  this.input.on(
    "pointermove",
    function (pointer) {
      let time = performance.now();
      if (this.input.mouse.locked) {
        time -= this.reference_time;
        let dx = pointer.movementX;
        let dy = pointer.movementY;
        this.raw_x += dx;
        this.raw_y += dy;
        // this.raw_x = clamp(this.raw_x, -400, 400);
        // this.raw_y = clamp(this.raw_y, -400, 400);
        // calculate extent & angle every time
        let extent = Math.sqrt(
          Math.pow(this.raw_x, 2) + Math.pow(this.raw_y, 2)
        );
        this.extent = extent;
        //this.extent = Math.min(extent, 400);
        //console.log(this.raw_x, this.raw_y, this.extent);
        if (this.clamped) {
          angle = clamp_rad;
          let x = extent * Math.cos(angle);
          let y = extent * Math.sin(angle);
          this.user.x = x;
          this.user.y = y;
        } else {
          this.user.x = this.raw_x;
          this.user.y = this.raw_y;
          //   this.user.x = clamp(this.user.x, -400, 400);
          //   this.user.y = clamp(this.user.y, -400, 400);
          //   //console.log(this.user.x, this.user.y);
        }
        this.user.x = clamp(this.user.x, -400, 400);
        this.user.y = clamp(this.user.y, -400, 400);
        // console.log(this.user.x, this.user.y);
        let angle2 = Phaser.Math.Angle.BetweenPoints(this.user, this.guide);
        this.guide.angle = Phaser.Math.RadToDeg(angle2);

        if (log) {
          this.trial_data.time.push(time);
          this.trial_data.raw_x.push(this.raw_x);
          this.trial_data.raw_y.push(this.raw_y);
          this.trial_data.cursor_x.push(this.user.x);
          this.trial_data.cursor_y.push(this.user.y);
        }
      }
    },
    this
  );
}

var state = 0;
var entering = 1;
var t0 = 500;
var t_guide = 1000;

function update() {
  // clamp circle

  if (state == 0) {
    // pre-task
    if (this.input.mouse.locked) {
      state = 1;
      this.txt.visible = false;
    }
  }
  if (state == 1) {
    // wait for they're in the center for 200ms
    if (entering) {
      entering = 0;
      this.target.setFillStyle(neutral);
      t0 = 500;
      t_guide = 2000;
    }
    t_guide -= game.loop.delta;
    if (this.extent >= 300 * 0.5) {
      this.user.visible = false;
      if (t_guide <= 0) {
        this.guide.visible = true;
      }
    } else {
      this.user.visible = true;
      this.guide.visible = false;
    }
    if (
      Phaser.Geom.Circle.ContainsPoint(
        this.origin,
        new Phaser.Geom.Point(this.user.x, this.user.y)
      )
    ) {
      t0 -= game.loop.delta;
      if (t0 <= 0) {
        this.guide.visible = false;
        state = 2;
        entering = 1;
        this.raw_x = 0;
        this.raw_y = 0;
        this.user.x = 0;
        this.user.y = 0;
      }
    } else {
      t0 = 500;
    }
  }
  if (state == 2) {
    // green means go, figure out trial conditions (clamped, not)
    if (entering) {
      entering = false;
      this.reference_time = performance.now();
      this.clamped = clamp_trial[trial_counter];
      this.target.setFillStyle(go);
      this.trial_data = {
        trial: trial_counter,
        clamp: this.clamped,
        clamp_angle: clamp_val,
        time: [],
        raw_x: [],
        cursor_x: [],
        raw_y: [],
        cursor_y: [],
      };
      log = true;
    }
    if (this.extent >= 300 - 15) {
      this.clamped = false;
      this.user.visible = false;
      trials.push(this.trial_data);
      console.log(this.trial_data);
      entering = true;
      state = 1;
      log = false;
      trial_counter++;
      this.target.setFillStyle(neutral);
      if (trial_counter >= clamp_trial.length) {
        state = 3;
      }
    }
  }
  if (state == 3) {
    if (entering) {
      // all done, download data
      this.done.visible = true;
      this.instr.visible = false;
      this.input.mouse.releasePointerLock();
      entering = false;
      var a = document.createElement("a");
      var file = new Blob([JSON.stringify(trials)], { type: "text/plain" });
      a.href = URL.createObjectURL(file);
      a.download = `data_${JSON.stringify(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  }
}
var game = new Phaser.Game(config);
