/* Set the width of the sidebar to 250px (show it) */
sidebarVis = true;
sidebar = document.getElementById("sidebar");
function toggleSidebar() {
  if (sidebarVis) {
    sidebar.style = "max-width: 0; padding-left: 0";
    document.getElementById("sidebarToggler").style="";
    //document.getElementById("sidebarToggler").innerHTML = "&#8249;";
  } else {
    //  document.getElementById("sidebar").style.right = "0";
    sidebar.style = "max-width: 500px; padding-left: 30px";
    document.getElementById("sidebarToggler").style="right: -25px; rotate: .5turn; transition: right 0.2s";
    
    //document.getElementById("sidebarToggler").innerHTML = "&#8198;&#8250;";
  }
  sidebarVis = !sidebarVis;
}

var inputWidth = 0, inputHeight = 0;
var uploadArea = document.getElementById('uploadArea');
var uploadButton = document.getElementById('uploadButton');
var preview = document.getElementById('inputPreview');
var txPreview = document.getElementById('txPreview');
var pvWrap = document.getElementById('previewWrapper');
var canIn = document.getElementById('canIn');
var canOut = document.getElementById('canOut');
var gl = canIn.getContext("webgl", {preserveDrawingBuffer: true});
var samplingRaster = document.getElementById("samplingRaster");
var cachedPixelRatio = devicePixelRatio;
var previewZoomRatio = 1; 
var existingCorners = 0;
var fromX = [0, 50, 0, 50]; /*samplingRaster*/
var fromY = [0, 0, 70, 70]; /*samplingRaster*/
var toX = [0, 0, 0, 0];
var toY = [0, 0, 0, 0];
var hr = 15; //handle radius

var zoomStages = [.01, .02, .05, 1/16, .1, 1/8, 1/6, .2, .25, 1/3, .4, .5, 2/3, .75, .9, 1, 1.1, 1.25, 4/3, 1.5, 5/3, 1.8, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 20, 25, 30, 40, 50, 60, 80, 100];
var zoomStage = 15;
zoomLevel = zoomStages[zoomStage];

function dropHandler(event) {
  console.log("File(s) dropped");

  // Prevent default behavior (Prevent file from being opened)
  event.preventDefault(); event.stopPropagation();

  if (event.dataTransfer && event.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    [...event.dataTransfer.items].forEach((item, i) => {
      // If dropped items aren't files, reject them
      const file = item.getAsFile();
      console.log(file.type);
      txPreview.src = preview.src = URL.createObjectURL(file);
      console.log(preview.src);
      
    }
  );}
  uploadArea.className = "uploadAreaHidden";  
  document.getElementById("scrollablePreview").style = "visibility: visible;";
}



preview.onload = function() {
  //URL.revokeObjectURL(preview.src) // free memory
  inputWidth = preview.naturalWidth;
  inputHeight = preview.naturalHeight;
  console.log(inputWidth + "x" + inputHeight + "/" + devicePixelRatio);
  pvWrap.style.width = inputWidth * zoomLevel / devicePixelRatio + "px"; 
  pvWrap.style.height = inputHeight * zoomLevel / devicePixelRatio + "px";
};

window.addEventListener("dragover",function(e){
  e = e || event;
  e.preventDefault();
},false);
window.addEventListener("drop",function(e){
  e = e || event;
  e.preventDefault();
},false);

/*function onFile() {
  var me = this,
    file = uploadArea.files[0],
    name = file.name.replace(/.[^/.]+$/, '');
  console.log('upload code goes here', file, name);
}*/

uploadArea.addEventListener('dragenter', function (e) {
  e.preventDefault(); e.stopPropagation();
  uploadArea.className = 'uploadAreaActive';
}, false);

uploadArea.addEventListener('dragleave', function (e) {
  e.preventDefault(); e.stopPropagation();
  uploadArea.className = 'uploadArea';
}, false);
/*uploadArea.addEventListener('drop', function (e) {
  e.preventDefault(); e.stopPropagation();
  uploadArea.parentNode.className = 'area';
}, false);*/

uploadArea.addEventListener('dragover', function (e) {
  e.preventDefault(); e.stopPropagation();
  uploadArea.className = 'uploadAreaActive';
}, false);

//uploadArea.addEventListener("dragdrop", dropHandler, false);
uploadArea.addEventListener("drop", dropHandler, false);
/*uploadArea.addEventListener("change", dropHandler, false);*/

setW = document.getElementById("setW");
setH = document.getElementById("setH");
setW.addEventListener("change", setRasterSize);
setH.addEventListener("change", setRasterSize);
document.getElementById("switchButton").addEventListener("click", swapDimensions);

setRasterSize();

function setRasterSize(){
  console.log(parseInt(setW.value) + "x" + parseInt(setH.value));
  fromX[1] = fromX[3] = 10 * parseInt(setW.value);
  samplingRaster.style.width = fromX[3] + "px";
  fromY[2] = fromY[3] = 10 * parseInt(setH.value);
  samplingRaster.style.height = fromY[3] + "px";
  if(existingCorners == 4) updateRasterTransform();
}

function swapDimensions(){
  temp = setW.value;
  setW.value = setH.value;
  setH.value = temp;
  setRasterSize(); /*not implied!*/
}

function onFile() {
  var me = this,
    file = uploadButton.files[0],
    name = file.name.replace(/\.[^/.]+$/, '');
  if (/*file.type === '' ||*/
    file.type.includes('image/')) {
    console.log("file.type");
    console.log(name);
    var preview = document.getElementById('inputPreview');
    txPreview.src = preview.src = URL.createObjectURL(file);
    console.log(preview.src);
//    inputWidth = preview.naturalWidth;
//    inputHeight = preview.src.naturalHeight;
//    preview.style.width = inputWidth / devicePixelRatio + "px";
//    preview.style.height = inputHeight / devicePixelRatio + "px";
    uploadArea.className = 'uploadAreaHidden';
    document.getElementById("scrollablePreview").style = "visibility: visible;";
  } else {
    window.alert('File type ' + file.type + ' not supported');
  }
}

//addEventListener(window.onresize(handleZoomOrResize()));

function handleZoomOrResize() {
  if(cachedPixelRatio != devicePixelRatio)  //zoom level changed, not just window resize
  {
    cachedPixelRatio = devicePixelRatio; 
    updatePreviewZoom();
    //todo-enh: alert user of preview zoom buttons? 
  }
}

function updatePreviewZoom() {  //change zoom of image as well as the draggable bits
  var oldZoomLevel = zoomLevel;
  updateRasterCoordinates();
  zoomLevel = zoomStages[zoomStage];
  pvWrap.style.width = inputWidth * zoomLevel / devicePixelRatio + "px";
  pvWrap.style.height = inputHeight * zoomLevel / devicePixelRatio + "px";
  gl.canvas.width  = gl.canvas.clientWidth  * devicePixelRatio;
  gl.canvas.height = gl.canvas.clientHeight * devicePixelRatio; 
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height); 
  if(zoomLevel >= 2) preview.style.imageRendering = "pixelated";
  else preview.style.imageRendering = "auto";
  document.getElementById("zoomLevel").innerHTML = (Math.round(zoomLevel*10000)/100) + "&#8202;%";
  for(i=0; i<corners.length; i++)
  {
//    console.log(corners[i]);
    corners[i].style = "left: " + (toX[i] * zoomLevel - hr) + "px; top:" + (toY[i] * zoomLevel - hr) + "px";
  }
  if (existingCorners  == 4) updateRasterTransform();
}
  //todo: raster


var corners = [];
var cornerNames = ["top_left", "top_right", "bottom_right", "bottom_left"]
var scrollablePreview = document.getElementById("scrollablePreview");
scrollablePreview.addEventListener("mousedown", createCorner);

function createCorner(e) {
  var posX, posY;
  posX = e.clientX + scrollablePreview.scrollLeft;
  posY = e.clientY + scrollablePreview.scrollTop;
  var newCorner = document.createElement('div');
  newCorner.className = "cornerPoint";
  corners.push(newCorner);
  newCorner.id = cornerNames[existingCorners];
  newCorner.setAttribute("data-n", existingCorners); 
  newCorner.style.left = (posX - hr) + "px";
  newCorner.style.top = (posY - hr) + "px";
  toX[existingCorners] = posX; //needs multiplication by zoom level!
  toY[existingCorners] = posY;
  existingCorners++;
  makeDraggable(newCorner);
  scrollablePreview.appendChild(newCorner);

  if (existingCorners == 4) 
  {
    updateRasterCoordinates();
    if (updateRasterTransform()) //success
    {
      scrollablePreview.removeEventListener("mousedown", createCorner);

    }
    else //Try corner rotation?
    {
      //try 3 D ←→ C 2
      corners[3] = corners[2]; corners[2] = newCorner;
      updateRasterCoordinates();
      if (!updateRasterTransform())  //Still unsuccessful
      { //try 1 B ←→ D 2
        corners[2] = corners[1]; corners[1] = newCorner;
        updateRasterCoordinates();
        if (!updateRasterTransform())  //Still unsuccessful    
        { //try 1 D ←→ A 0
          corners[1] = corners[0]; corners[0] = newCorner;
          updateRasterCoordinates();
          if (!updateRasterTransform())
          {
            corners.shift();
            newCorner.remove();
            existingCorners--;
            console.log("Unsuccessful adding 4th corner");
            return null;
        }
        }
      }
    }
    var i = 0;
    for(i=0; i<4; i++)
    {
      console.log(corners[i]);
      corners[i].id = cornerNames[i];
      corners[i].setAttribute("data-n", i); 
      scrollablePreview.removeEventListener("mousedown", createCorner);
    }
  }
}

function updateRasterCoordinates()
{
  var i = 0;
  for(i=0; i<corners.length; i++)
  {
//    console.log(corners[i]);
    corners[i].id = cornerNames[i];
    corners[i].setAttribute("data-n", i);
    toX[i] = (corners[i].offsetLeft + hr)/zoomLevel;
    toY[i] = (corners[i].offsetTop + hr)/zoomLevel; 
  }
}

function makeDraggable(el) {
  var dX = 0, dY = 0, ogX = 0, ogY = 0; virtX = 0; virtY = 0;
  el.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault(); e.stopPropagation();
    ogX = e.clientX;
    ogY = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
    virtX = el.offsetLeft; virtY = el.offsetTop;
    //scrollablePreview.removeEventListener("mousedown");
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    dX = ogX - e.clientX;
    dY = ogY - e.clientY;
    virtX = virtX-dX;
    virtY = virtY-dY;
    el.style.left = (Math.max(-1.6*hr, virtX)) + "px";
    el.style.top = (Math.max(-1.6*hr, virtY)) + "px";
    toX[el.getAttribute("data-n")] = (Math.max(-1.8*hr, virtX) + hr); //needs multiplication by zoom factor!
    toY[el.getAttribute("data-n")] = (Math.max(-1.8*hr, virtY) + hr); //needs multiplication by zoom factor!
    ogX = e.clientX;
    ogY = e.clientY;
    if (existingCorners == 4) updateRasterTransform();
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    //scrollablePreview.addEventListener("mousedown", createCorner);
  }
}

/* attempt at WASM

const importObject = {
  module: {},
  env: {
    memory: new WebAssembly.Memory({ initial: 256 }),
  }
};

WebAssembly.instantiateStreaming(
  fetch('main.wasm'),
  importObject
).then(result => {
  const Sum = result.instance.exports.Sum;
  console.log(Sum(4, 5));
  console.log(Sum(10, 10));
});

*/

function updateRasterTransform() {
  updateRasterCoordinates();
  A = []; b = [];
  for (i = 0; i < 4; i++)
  {
    A.push([fromX[i], fromY[i], 1, 0, 0, 0, -fromX[i] * toX[i], -fromY[i] * toX[i]]);
    A.push([0, 0, 0, fromX[i], fromY[i], 1, -fromX[i] * toY[i], -fromY[i] * toY[i]]);
    b.push(toX[i]);
    b.push(toY[i]);
  }
  try {h = solve(A, b)}
  catch {samplingRaster.style = "visibility: hidden"; /* console.log("null matrix!"); */ return false;};
  Hx = [[h[0], h[1], 0, h[2]],
        [h[3], h[4], 0, h[5]],
        [   0,    0, 1,    0],
        [h[6], h[7], 0,    1]];

  samplingRaster.style = "width: " + fromX[3] + "px; height: " + fromY[3] + "px; transform: matrix3d(" + matrixToCSS(Hx, zoomLevel) + "); visibility: visible";
  var i = 0;
  for (i = 0; i < 4; i++)
  {
    j = i+1; if(j==4) j=0;
    if (!sanityCheck(fromX[i], fromY[i], fromX[j], fromY[j], toX[i], toY[i], toX[j], toY[j], Hx))
    { 
      txPreview.style = samplingRaster.style = "visibility: hidden"; 
      return false;
    }
  }
  A = []; b = [];
  for (i = 0; i < 4; i++)
  {
    A.push([(toX[i])*devicePixelRatio, (toY[i])*devicePixelRatio, 1, 0, 0, 0, -(toX[i])*devicePixelRatio * fromX[i], -(toY[i])*devicePixelRatio * fromX[i]]);
    A.push([0, 0, 0, (toX[i])*devicePixelRatio, (toY[i])*devicePixelRatio, 1, -(toX[i])*devicePixelRatio * fromY[i], -(toY[i])*devicePixelRatio * fromY[i]]);
    b.push(fromX[i]);
    b.push(fromY[i]);
  }
  try {h = solve(A, b)}
  catch {txPreview.style = "visibility: hidden"; /* console.log("null matrix!"); */ return false;};
  Hi = [[h[0], h[1], 0, h[2]],
        [h[3], h[4], 0, h[5]],
        [   0,    0, 1,    0],
        [h[6], h[7], 0,    1]];
  console.log(mmultiply(Hi, [[0], [0], [0], [1]]));
 // Hi = invert(cssH);
  txPreview.style = "width: " + inputWidth + "px; height: " + inputHeight + "px; transform: matrix3d(" + matrixToCSS(Hi, .1/devicePixelRatio) + "); visibility: visible";
  return true;
}

function matrixToCSS(H, factor)
{
  cssH = H;
  for (i = 0; i < 2; i++)
  {
    for (j = 0; j < 4; j++)
    {
      cssH[i][j] *= factor;
    }
  }
  
  cssH_text = "";
  for (i = 0; i < 4; i++)
  {
    for (j = 0; j < 4; j++)
    {
      cssH_text += cssH[j][i].toFixed(20);
      if(i + j < 6) cssH_text += ',';
    } 
  }
  return cssH_text;
}

function sanityCheck(afX, afY, bfX, bfY, atX, atY, btX, btY, H)
{
  cf = [(afX+bfX)/2, (afY+bfY)/2, 0, 1] // midpoint of line AB (from)
  ct = [(atX+btX)/2, (atY+btY)/2, 0, 1] // midpoint of line AB (to)
  cx = mulMat(H, cf);  // midpoint of line AB (xform applied)
 // ax = mulMat(H, [afX, afY, 0, 1]);
 // console.log([atX, atY, 0, 1]);
 // console.log(ax);
 // console.log(ct);
 // console.log(cx);
  if(btX != atX)
  {
    ratio = (cx[0]/cx[3]/zoomLevel-atX)/(btX-atX); //ratio to midpoint, X
  } else 
  {
    ratio = (cx[1]/cx[3]/zoomLevel-atY)/(btY-atY); //ratio to midpoint, Y
  }
//  console.log(ratio); 
  if(ratio > 1 || ratio < 0) return false; //if the midpoint is on line
//  console.log(Math.abs(cx[0]-ct[0])+Math.abs(cx[1]-ct[1]));
//  if(Math.abs(cx[0]-ct[0])+Math.abs(cx[1]-ct[1]) > 1) return false;
  return true;
}

zoomrI = document.getElementById("zoomIn");
zoomrO = document.getElementById("zoomOut");
zoomrI.addEventListener("click", zoomIn);
zoomrO.addEventListener("click", zoomOut);
zoomrI.addEventListener("mousedown", keepZoomin);
zoomrO.addEventListener("mousedown", keepZoomin);
zoomrI.addEventListener("mouseup", stopZoomin);
zoomrO.addEventListener("mouseup", stopZoomin);
zoomrI.addEventListener("mouseout", stopZoomin);
zoomrO.addEventListener("mouseout", stopZoomin);

var intrv;

function keepZoomin(e)
{
  el = e.target;  
  //console.log(el);  
  if (el == zoomrI) intrv = setInterval(function() {zoomrI.click()}, 200);
  if (el == zoomrO) intrv = setInterval(function() {zoomrO.click()}, 200);
}

function stopZoomin()
{
  clearInterval(intrv);
}

function zoomIn()
{
  if(zoomStage < zoomStages.length-1) zoomStage++;
  updatePreviewZoom();
}

function zoomOut()
{
  if(zoomStage > 0) zoomStage--;
  updatePreviewZoom();
}
/*
// FOLLOWING IS ATTEMPT AT WebGL... I mean, I can draw the points but what is it good for if I can't READ canvas pixel values any faster than JS?
function drawOnCanvas() {
  gl.clearColor(0.0, 0.0, 1.0, 0.5);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  gl.enableVertexAttribArray(positionAttributeLocation);
  // Bind the position buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      positionAttributeLocation, size, type, normalize, stride, offset)
  var primitiveType = gl.POINTS;
  var offset = 0;
  var count = 3;
  gl.drawArrays(primitiveType, offset, count);

  gl.useProgram(program2);
  gl.enableVertexAttribArray(positionAttributeLocation2);
  // Bind the position buffer.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 2;          // 2 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      positionAttributeLocation, size, type, normalize, stride, offset)
  var primitiveType = gl.POINTS;
  var offset = 0;
  var count = 3;
  gl.drawArrays(primitiveType, offset, count);

}

function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

var vertexShaderSource = `
attribute vec4 a_position;
void main() {
  gl_Position = a_position;
  gl_PointSize = 4.0;
}`
var fragmentShaderSource = `
precision mediump float;   
void main() {
  gl_FragColor = vec4(1, 0, 0.5, 1);
}`
var vertexShaderSource2 = `
attribute vec4 a_position;
void main() {
  gl_Position = a_position;
  gl_PointSize = 2.0;
}`
var fragmentShaderSource2 = `
precision mediump float;   
void main() {
  gl_FragColor = vec4(0, 0, 0, 0);
}`
var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

var vertexShader2 = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource2);
var fragmentShader2 = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource2);

function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
 
  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

var program = createProgram(gl, vertexShader, fragmentShader);
var program2 = createProgram(gl, vertexShader2, fragmentShader2);
var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
var positionAttributeLocation2 = gl.getAttribLocation(program2, "a_position");
var positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
// three 2d points
var positions = [
  0, 0,
  0, 0.5,
  0.7, 0,
];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

// console.log(mulMat([[1, 2, 3], [4, 5, 6], [7, 8, 9]],[2, 1, 3]));

/*
function base64Decode(str) {
  try { // Browser
      return atob(str);
  } catch(err) { // Node
      return Buffer.from(str, "base64");
  }
};

const importObject = {
  imports: {
    imported_func: (arg: number) => {
      console.log(`Hello from JavaScript: ${arg}`)
    }
  },
};

const wasmBytes = base64Decode("AGFzbQEAAAABhoCAgAABYAF/AX8DgoCAgAABAASEgICAAAFwAAAFg4CAgAABAAEGgYCAgAAAB5yAgIAAAgZtZW1vcnkCAA9fWjEwaW50X2RvdWJsZWkAAAqNgICAAAGHgICAAAAgAEEBdAs=");
const module = await WebAssembly.instantiate(wasmBytes, importObject);
*/


//FOLLOWING IS linear.js LIBRARY (MIT LICENSE) 
/**
 * Gauss-Jordan elimination
 */

/*var linear = (function(){
  /**
   * Used internally to solve systems
   * If you want to solve A.x = B,
   * choose data=A and mirror=B.
   * mirror can be either an array representing a vector
   * or an array of arrays representing a matrix.
   */
  function Mat(data, mirror) {
    // Clone the original matrix
    this.data = new Array(data.length);
    for (var i=0, cols=data[0].length; i<data.length; i++) {
      this.data[i] = new Array(cols);
      for(var j=0; j<cols; j++) {
        this.data[i][j] = data[i][j];
      }
    }
  
    if (mirror) {
      if (typeof mirror[0] !== "object") {
        for (var i=0; i<mirror.length; i++) {
          mirror[i] = [mirror[i]];
        }
      }
      this.mirror = new Mat(mirror);
    }
  }
  
  /**
   * Swap lines i and j in the matrix
   */
  Mat.prototype.swap = function (i, j) {
    if (this.mirror) this.mirror.swap(i,j);
    var tmp = this.data[i];
    this.data[i] = this.data[j];
    this.data[j] = tmp;
  }
  
  /**
   * Multiply line number i by l
   */
  Mat.prototype.multline = function (i, l) {
    if (this.mirror) this.mirror.multline(i,l);
    var line = this.data[i];
    for (var k=line.length-1; k>=0; k--) {
      line[k] *= l;
    }
  }
  
  /**
   * Add line number j multiplied by l to line number i
   */
  Mat.prototype.addmul = function (i, j, l) {
    if (this.mirror) this.mirror.addmul(i,j,l);
    var lineI = this.data[i], lineJ = this.data[j];
    for (var k=lineI.length-1; k>=0; k--) {
      lineI[k] = lineI[k] + l*lineJ[k];
    }
  }
  
  /**
   * Tests if line number i is composed only of zeroes
   */
  Mat.prototype.hasNullLine = function (i) {
    for (var j=0; j<this.data[i].length; j++) {
      if (this.data[i][j] !== 0) {
        return false;
      }
    }
    return true;
  }
  
  Mat.prototype.gauss = function() {
    var pivot = 0,
        lines = this.data.length,
        columns = this.data[0].length,
        nullLines = [];
  
    for (var j=0; j<columns; j++) {
      // Find the line on which there is the maximum value of column j
      var maxValue = 0, maxLine = 0;
      for (var k=pivot; k<lines; k++) {
        var val = this.data[k][j];
        if (Math.abs(val) > Math.abs(maxValue)) {
          maxLine = k;
          maxValue = val;
        } 
      }
      if (maxValue === 0) {
        // The matrix is not invertible. The system may still have solutions.
        nullLines.push(pivot);
      } else {
        // The value of the pivot is maxValue
        this.multline(maxLine, 1/maxValue);
        this.swap(maxLine, pivot);
        for (var i=0; i<lines; i++) {
          if (i !== pivot) {
            this.addmul(i, pivot, -this.data[i][j]);
          }
        }
      }
      pivot++;
    }
  
    // Check that the system has null lines where it should
    for (var i=0; i<nullLines.length; i++) {
      if (!this.mirror.hasNullLine(nullLines[i])) {
        throw new Error("singular matrix");
      }
    }
    return this.mirror.data;
  }
  
  /**
   * Solves A.x = b
   * @param A
   * @param b
   * @return x
   */
  /*exports.solve = */function solve(A, b) {
    var result = new Mat(A,b).gauss();
    if (result.length > 0 && result[0].length === 1) {
      // Convert Nx1 matrices to simple javascript arrays
      for (var i=0; i<result.length; i++) result[i] = result[i][0];
    }
    return result;
  }
  
  function identity(n) {
    var id = new Array(n);
    for (var i=0; i<n; i++) {
      id[i] = new Array(n);
      for (var j=0; j<n; j++) {
        id[i][j] = (i === j) ? 1 : 0;
      }
    }
    return id;
  }
  
  /**
   * invert a matrix
   */
  /*exports.invert = */function invert(A) {
    return new Mat(A, identity(A.length)).gauss();
  }
  /*
  return exports;
  })();
  
  
  if (typeof module.exports === "object") module.exports = linear;*/
  

  /*****************************************/
  mmultiply = (a, b) => a.map(x => transpose(b).map(y => dotproduct(x, y)));
  dotproduct = (a, b) => a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
  transpose = a => a[0].map((x, i) => a.map(y => y[i]));

function mulMat(mat, vec)
{
    // To store result
    var rslt = Array(vec.length).fill(0);
    for (i = 0; i < vec.length; i++)
    {
        for (j = 0; j < mat.length; j++)
        {
          rslt[i] += mat[i][j] * vec[j];
        }
    }
    return rslt;
}
