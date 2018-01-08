package java

import kotlin.math.floor

class Stack<T>(list:MutableList<T>) {
    private var items: MutableList<T> = list

    val size: Int
        get() = items.size

    fun push(element:T) {
        val position = items.count()
        items.add(position, element)
    }

    override fun toString() = items.toString()

    fun pop(): T? {
        return if (items.isEmpty()) {
            null
        } else {
            items.removeAt(items.count() - 1)
        }
    }

    fun peek(): T? {
        return if (items.isEmpty()) {
            null
        } else {
            items.last()
        }
    }

    fun clear() {
        items.clear()
    }

    operator fun iterator() = items.iterator()

    companion object {
        fun<T> create() = Stack<T>(mutableListOf())
    }
}

class Random {
    fun nextInt(rng: Int): Int {
        return floor(random() * rng).toInt()
    }

    fun nextBoolean(): Boolean {
        return nextInt(2) == 1
    }
}

interface Coder {
    fun encode(out: ObjectOutput)
    fun decode(coder: ObjectInput)
}

interface ObjectOutput {
    fun writeInt(v: Int)
    fun writeByte(v: Byte)
    fun writeLong(v: Long)
    fun writeString(v: String)
    fun writeBoolean(v: Boolean)
    fun writeIntArray(v: IntArray)
    fun close()
}

interface ObjectInput {
    fun readInt(): Int
    fun readByte(): Byte
    fun readLong(): Long
    fun readString(): String
    fun readBoolean(): Boolean
    fun readIntArray(): IntArray
    fun close()
}

interface Runnable {
    fun run()
}

fun ByteArray.gbkString(offset: Int, length: Int): String {
    val arr = sliceArray(offset until offset+length).toTypedArray()
    return jsGbkDecode(arr)
}

fun String.gbkBytes(): ByteArray {
    return jsGbkEncode(this).toByteArray()
}

object System {
    fun arraycopy(src:ByteArray, srcPos:Int,
                  dest:ByteArray, destPos:Int,
                  length:Int) {
        for (i in 0 until length) {
            dest[destPos+i] = src[srcPos+i]
        }
    }

    fun<T> arraycopy(src:Array<T>, srcPos:Int,
                  dest:Array<T>, destPos:Int,
                  length:Int) {
        for (i in 0 until length) {
            dest[destPos+i] = src[srcPos+i]
        }
    }
}

interface Queue<T> {
    fun push(item : T)
    fun pop(): T?
}

class ArrayQueue<T>(private val base: MutableList<T>): MutableList<T> by base, Queue<T> {
    override fun push(item : T) {
        base.add(item)
    }

    override fun pop(): T? {
        return if (base.isEmpty()) {
            null
        } else {
            val r = base.first()
            base.removeAt(0)
            r
        }
    }

    companion object {
        fun<T> create(): ArrayQueue<T> = ArrayQueue(mutableListOf())
    }
}

private fun hexByte(b: Byte): String {
    val tbl = "0123456789ABCDEF"
    val l = tbl[b.toInt() and 0xF]
    val h = tbl[(b.toInt() shl 4) and 0xF]
    return "$h$l"
}

private fun hexByte(h: Char, l: Char): Byte {
    fun half(c: Char): Int {
        return when (c) {
            in '0'..'9' -> c - '0'
            in 'a'..'f' -> c - 'a' + 10
            in 'A'..'F' -> c - 'A' + 10
            else -> 0// throw Error("Decode hex failed")
        }
    }
    return (half(h) shl 4 or half(l)).toByte()
}

private fun hexDecode(s: String): ByteArray {
    return (0..s.length/2).map {
        hexByte(s[it*2], s[it*2+1])
    }.toByteArray()
}

private fun hexEncode(arr: ByteArray): String {
    return arr.joinToString("") {
        hexByte(it)
    }
}

class File(private val path: String) {

    companion object {
        fun contentsOf(path: String): ByteArray {
            val file = File(path)
            val rv = file.readAll()
            file.close()
            return rv
        }
    }

    fun exists(): Boolean {
        return jsStorageHas(path)
    }

    fun createNewFile() {
    }

    fun readAll(): ByteArray {
        val s = jsStorageGet(path)
        return if (s == null) {
            byteArrayOf()
        } else {
            hexDecode(s)
        }
    }

    fun wholeWrite(buf: ByteArray) {
        jsStorageSet(path, hexEncode(buf))
    }

    fun close() {
    }
}


private fun Byte.toIntShl(sft: Int): Int {
    return (this.toInt() and 0xFF) shl (sft * 8)
}

private fun Int.byte(ind: Int): Byte {
    return ((this shr (ind * 8)) and 0xFF).toByte()
}

class ObjectInputStream(private val file: File): ObjectInput {
    private val buffer = file.readAll()
    private var cur = 0

    override fun readByte(): Byte {
        return buffer[cur++]
    }

    private fun readBytes(n: Int): ByteArray {
        val c = cur
        cur += n
        return buffer.sliceArray(c until c+n)
    }

    override fun readInt(): Int {
        val bytes = readBytes(2)
        return (bytes[0].toIntShl(0)
                or bytes[1].toIntShl(1))
    }

    override fun readLong(): Long {
        val bytes = readBytes(4)
        return (bytes[0].toIntShl(0)
                or bytes[1].toIntShl(1)
                or bytes[2].toIntShl(2)
                or bytes[3].toIntShl(3)).toLong()
    }

    override fun readString(): String {
        val len = readInt()
        return readBytes(len).gbkString(0, len)
    }

    override fun readBoolean(): Boolean {
        return readByte().toInt() != 0
    }

    override fun readIntArray(): IntArray {
        val len = readInt()
        return IntArray(len) {
            readInt()
        }
    }

    override fun close() {
        file.close()
    }
}

inline fun<reified T> readArray(io: ObjectInput, read: (ObjectInput) -> T): Array<T> {
    val len = io.readInt()
    return Array(len) {
        read(io)
    }
}

fun<T> writeArray(out: ObjectOutput, objs: Array<T>, write: (ObjectOutput, T) -> Unit) {
    out.writeInt(objs.size)
    for (obj in objs) {
        write(out, obj)
    }
}

class ObjectOutputStream(private val file: File): ObjectOutput {
    private var buffer = mutableListOf<Byte>()

    override fun writeInt(v: Int) {
        buffer.add(v.byte(0))
        buffer.add(v.byte(1))
    }

    override fun writeByte(v: Byte) {
        buffer.add(v)
    }

    override fun writeLong(v: Long) {
        val i = v.toInt()
        buffer.add(i.byte(0))
        buffer.add(i.byte(1))
        buffer.add(i.byte(2))
        buffer.add(i.byte(3))
    }

    override fun writeString(v: String) {
        val bytes = v.gbkBytes()
        val len = bytes.size
        writeInt(len)
        buffer.addAll(bytes.toList())
    }

    override fun writeBoolean(v: Boolean) {
        val i = if (v) 0 else 1
        writeByte(i.toByte())
    }

    override fun writeIntArray(v: IntArray) {
        writeInt(v.size)
        for (i in v) {
            writeInt(i)
        }
    }

    override fun close() {
        file.wholeWrite(buffer.toByteArray())
        file.close()
    }
}

fun objectInputOf(f: File): ObjectInput {
    return ObjectInputStream(f)
}

fun objectOutputOf(f: File): ObjectOutput {
    return ObjectOutputStream(f)
}

fun random() = jsRandom()

external fun jsStorageGet(path: String): String?
external fun jsStorageSet(path: String, value: String?)
external fun jsStorageHas(path: String): Boolean
external fun jsGbkEncode(path: String): Array<Byte>
external fun jsGbkDecode(data: Array<Byte>): String
external fun jsRandom(): Double

