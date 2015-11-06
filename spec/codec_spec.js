var _ = require("underscore");
var f = require("../lib/functional");
var codec = require("../lib/codec");

// Test functions

// TODO: Duplicate
function totalBytes(values, state) {
  // If buffer is too big, slice it up so that it can be sent
  // immediately without any further modifications.
  var bytes = values[values.length - 1];
  if (bytes < state.buf.length)
    state.buf = state.buf.slice(0, bytes);

  return bytes;
}

// TODO: Duplicate
function decodedValues(values, state) {
  return values;
}

var singleByteEncode = f.actions([codec.encodeUByte(0xA0)], totalBytes);
var multiByteEncode = f.actions([codec.encodeUByte(0xA0), codec.encodeUByte(0xA1)], totalBytes);

var singleByteDecode = f.actions([codec.decodeUByte()], decodedValues);
var multiByteDecode = f.actions([codec.decodeUByte(), codec.decodeUByte()], decodedValues);
var singleVLongDecode = f.actions([codec.decodeVLong()], decodedValues);
var multiVNumDecode = f.actions([codec.decodeVInt(), codec.decodeVLong()], decodedValues);
var singleObjectDecode = f.actions([codec.decodeObject()], decodedValues);
var multiObjectDecode = f.actions([codec.decodeObject(), codec.decodeObject()], decodedValues);


// Tests

describe("Bytes encode/decode", function() {
  it("can encode a number of Bytes", function() {
    var bytes = new Buffer([48, 49, 50, 51, 52, 53, 54, 55]);
    var bytesEncode = f.actions([codec.encodeBytes(bytes)], totalBytes);
    var bytebuf = assertEncode(newByteBuf(), bytesEncode, 8);
    var bytesDecode = f.actions([codec.decodeBytes(8)], decodedValues);
    var actual = bytesDecode({buf: bytebuf.buf, offset: 0});
    expect(actual).toEqual([bytes]);
  });
  it("can encode Object + Bytes + Object", function() {
    var bytes = new Buffer([48, 49, 50, 51, 52, 53, 54, 55]);
    var encodeChain = f.actions([codec.encodeObject("one"), codec.encodeBytes(bytes), codec.encodeObject("two")], totalBytes);
    var bytebuf = assertEncode(newByteBuf(), encodeChain, strSize("one") + 8 + strSize("two"));
    var decodeChain = f.actions([codec.decodeObject(), codec.decodeBytes(8), codec.decodeObject()], decodedValues);
    var actual = decodeChain({buf: bytebuf.buf, offset: 0});
    expect(actual[0]).toBe("one");
    expect(actual[1]).toEqual(bytes);
    expect(actual[2]).toBe("two");
  });
  it("can encode a chain of Bytes => Object", function() {
    var bytes = new Buffer([48, 49, 50, 51, 52, 53, 54, 55]);
    var encodeChain = f.actions([codec.encodeBytes(bytes), codec.encodeObject("one")], totalBytes);
    var bytebuf = assertEncode(newByteBuf(), encodeChain, 8 + strSize("one"));
    var decodeChain = f.actions([codec.decodeBytes(8), codec.decodeObject()], decodedValues);
    var actual = decodeChain({buf: bytebuf.buf, offset: 0});
    expect(actual[0]).toEqual(bytes);
    expect(actual[1]).toBe("one");
  });
  it("can encode a chain of Object => Bytes", function() {
    var bytes = new Buffer([48, 49, 50, 51, 52, 53, 54, 55]);
    var encodeChain = f.actions([codec.encodeObject("one"), codec.encodeBytes(bytes)], totalBytes);
    var bytebuf = assertEncode(newByteBuf(), encodeChain, 8 + strSize("one"));
    var decodeChain = f.actions([codec.decodeObject(), codec.decodeBytes(8)], decodedValues);
    var actual = decodeChain({buf: bytebuf.buf, offset: 0});
    expect(actual[0]).toBe("one");
    expect(actual[1]).toEqual(bytes);
  });
});

describe("Object encode/decode", function() {
  it("can encode a String", function() {
    var stringEncode = f.actions([codec.encodeObject("one")], totalBytes);
    var bytebuf = assertEncode(newByteBuf(), stringEncode, strSize("one"));
    expect(singleObjectDecode({buf: bytebuf.buf, offset: 0})).toEqual(["one"]);
  });
  it("can encode multiple Strings", function() {
    var stringEncode = f.actions([codec.encodeObject("one"), codec.encodeObject("two")], totalBytes);
    var bytebuf = assertEncode(newByteBuf(), stringEncode, strSize("one") + strSize("two"));
    expect(multiObjectDecode({buf: bytebuf.buf, offset: 0})).toEqual(["one", "two"]);
  });
});

function strSize(str) {
  var len = Buffer.byteLength(str);
  return len + numSize(len);
}

describe("Variable number encode/decode", function() {
  it("can encode 0", function() {
    encodeDecodeVNum(0);
  });
  it("can encode 2^7 - 1", function() {
    encodeDecodeVNum(Math.pow(2, 7) - 1);
  });
  it("can encode 2^7", function() {
    encodeDecodeVNum(Math.pow(2, 7));
  });
  it("can encode 2^14 - 1", function() {
    encodeDecodeVNum(Math.pow(2, 14) - 1);
  });
  it("can encode 2^14", function() {
    encodeDecodeVNum(Math.pow(2, 14));
  });
  it("can encode 2^21 - 1", function() {
    encodeDecodeVNum(Math.pow(2, 21) - 1);
  });
  it("can encode 2^21", function() {
    encodeDecodeVNum(Math.pow(2, 21));
  });
  it("can encode 2^28 - 1", function() {
    encodeDecodeVNum(Math.pow(2, 28) - 1);
  });
  it("can encode 2^28", function() {
    encodeDecodeVNum(Math.pow(2, 28));
  });
  it("can encode 2^31 - 1", function() {
    encodeDecodeVNum(Math.pow(2, 31) - 1);
  });
  it("fails to encode 2^31 as a VInt because it is out of bounds", function() {
    var encode = f.actions([codec.encodeVInt(Math.pow(2, 31))], totalBytes);
    expect(function() { encode(newByteBuf()) }).toThrow("must be less than 2^31");
  });
  it("can encode 2^31", function() {
    encodeDecodeVLong(Math.pow(2, 31));
  });
  it("can encode 2^35 - 1", function() {
    encodeDecodeVLong(Math.pow(2, 35) - 1);
  });
  it("can encode 2^35", function() {
    encodeDecodeVLong(Math.pow(2, 35));
  });
  it("can encode 2^42 - 1", function() {
    encodeDecodeVLong(Math.pow(2, 42) - 1);
  });
  it("can encode 2^42", function() {
    encodeDecodeVLong(Math.pow(2, 42));
  });
  it("can encode 2^49 - 1", function() {
    encodeDecodeVLong(Math.pow(2, 49 - 1));
  });
  it("can encode 2^49", function() {
    encodeDecodeVLong(Math.pow(2, 49));
  });
  it("can encode 2^53 - 1", function() {
    encodeDecodeVLong(Math.pow(2, 53) - 1);
  });
  it("fails to encode 2^53 as a VLong because it is out of bounds", function() {
    var encode = f.actions([codec.encodeVLong(Math.pow(2, 53))], totalBytes);
    expect(function() { encode(newByteBuf()) })
        .toThrow("must be less than 2^53 (javascript safe integer limitation)");
  });
  it("fails to encode a number when it's not a number", function() {
    var encode = f.actions([codec.encodeVInt("blah")], totalBytes);
    expect(function() { encode(newByteBuf()) })
        .toThrow("must be a number, must be >= 0, must be less than 2^31");
  });
  it("fails to encode a number when it's negative", function() {
    var encode = f.actions([codec.encodeVInt(-1)], totalBytes);
    expect(function() { encode(newByteBuf()) }).toThrow("must be >= 0");
  });
});

function numSize(num) {
  var limits = [7,14,21,28,35,42,49,53];
  for (var i = 0; i < limits.length; i++) {
    var limit = limits[i];
    if (num < Math.pow(2, limit)) return Math.ceil(limit / 7);
  }
}

function encodeDecodeVNum(num) {
  var expectedBytes = numSize(num);
  var numsEncode = f.actions([codec.encodeVInt(num), codec.encodeVLong(num)], totalBytes);
  var bytebuf = assertEncode(newByteBuf(), numsEncode, expectedBytes * 2);
  expect(multiVNumDecode({buf: bytebuf.buf, offset: 0})).toEqual([num, num]);
}

function encodeDecodeVLong(num) {
  var expectedBytes = numSize(num);
  var bytebuf = newByteBuf();
  var encode = f.actions([codec.encodeVLong(num)], totalBytes);
  expect(encode(bytebuf)).toBe(expectedBytes);
  expect(singleVLongDecode({buf: bytebuf.buf, offset: 0})).toEqual([num]);
}

describe("Basic encode/decode", function() {
  it("fails to encode a byte when it's not a number", function() {
    var invalidByteEncode = f.actions([codec.encodeUByte("blah")], totalBytes);
    expect(function() { invalidByteEncode(newByteBuf()) })
        .toThrow("must be a number, must be >= 0");
  });
  it("fails to encode a number when it's negative", function() {
    var encode = f.actions([codec.encodeUByte(-1)], totalBytes);
    expect(function() { encode(newByteBuf()) }).toThrow("must be >= 0");
  });
  it("fails to encode a byte when the value is too big (256 or higher)", function() {
    var overLimitByteEncode = f.actions([codec.encodeUByte(0x100)], totalBytes);
    expect(function() { overLimitByteEncode(newByteBuf()) }).toThrow("value is out of bounds");
  });
  it("fails to decode if past the buffer end", function() {
    var bytebuf = newByteBuf();
    expect(function() { singleByteDecode({buf: bytebuf.buf, offset: 128}) }).toThrow("index out of range");
  });
  it("can encode a byte with limit value 255", function() {
    var limitByteEncode = f.actions([codec.encodeUByte(0xFF)], totalBytes);
    var bytebuf = assertEncode(newByteBuf(), limitByteEncode, 1);
    expect(singleByteDecode({buf: bytebuf.buf, offset: 0})).toEqual([0xFF]);
  });
  it("can encode a multiple bytes with actions", function() {
    var bytebuf = assertEncode(newByteBuf(), multiByteEncode, 2);
    expect(multiByteDecode({buf: bytebuf.buf, offset: 0})).toEqual([0xA0, 0xA1]);
  });
  it("can encode a single byte with actions", function() {
    var bytebuf = assertEncode(newByteBuf(), singleByteEncode, 1);
    expect(singleByteDecode({buf: bytebuf.buf, offset: 0})).toEqual([0xA0]);
  });
});

function assertEncode(bytebuf, encode, expectedBytes) {
  expect(encode(bytebuf)).toBe(expectedBytes);
  expect(bytebuf.buf.length).toBe(expectedBytes);
  return bytebuf;
}

function newByteBuf() {
  return {buf: new Buffer(128), offset: 0};
}
