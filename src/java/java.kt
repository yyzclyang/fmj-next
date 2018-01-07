package java


class Stack<T>(list:MutableList<T>): Iterator<T> {

    var itCounter: Int = 0

    var items: MutableList<T> = list

    val size: Int
        get() = this.items.size


    fun isEmpty(): Boolean = this.items.isEmpty()

    fun count(): Int = this.items.count()

    fun push(element:T) {
        val position = this.count()
        this.items.add(position, element)
    }

    override fun toString() = this.items.toString()

    fun pop(): T? {
        if (this.isEmpty()) {
            return null
        } else {
            val item =  this.items.count() - 1
            return this.items.removeAt(item)
        }
    }

    fun peek(): T? {
        if (isEmpty()) {
            return null
        } else {
            return this.items[this.items.count() - 1]
        }
    }

    override fun hasNext(): Boolean {
        val hasNext = itCounter < count()

        // As soon as condition fails, reset the counter
        if (!hasNext) itCounter = 0

        return hasNext
    }

    override fun next(): T {
        if (hasNext()) {
            val topPos: Int = (count() - 1) - itCounter
            itCounter++
            return this.items[topPos]
        } else {
            throw NoSuchElementException("No such element")
        }
    }

    fun clear() {
        this.items.clear()
    }

    fun listIterator(index: Int) = this.items.listIterator(index)

    companion object {
        fun<T> create() = Stack<T>(mutableListOf())
    }
}

class Random {
    fun nextInt(rng: Int): Int {
        // TODO
        return 0
    }

    fun nextBoolean(): Boolean {
        // TODO
        return true
    }
}

interface Externalizable {
    fun writeExternal(out: ObjectOutput)
    fun readExternal(coder: ObjectInput)
}

interface ObjectOutput {
    fun writeInt(v: Int)
    fun writeLong(v: Long)
    fun writeString(v: String)
    fun writeBoolean(v: Boolean)
    fun writeIntArray(v: IntArray)
    fun<T: Externalizable> writeArray(v: Array<T>)
    fun close()
}

interface ObjectInput {
    fun readInt(): Int
    fun readLong(): Long
    fun readString(): String
    fun readBoolean(): Boolean
    fun readIntArray(): IntArray
    fun<T: Externalizable> readArray(): Array<T>
    fun close()
}

interface Runnable {
    fun run()
}

fun String.encode(encoding: String): ByteArray {
    TODO()
}

fun ByteArray.gbkString(offset: Int, length: Int): String {
    TODO()
}

fun String.gbkBytes(): ByteArray = encode("GBK")

object System {
    fun arraycopy(src:ByteArray, srcPos:Int,
                  dest:ByteArray, destPos:Int,
                  length:Int) {
        TODO()
    }
    fun<T> arraycopy(src:Array<T>, srcPos:Int,
                  dest:Array<T>, destPos:Int,
                  length:Int) {
        TODO()
    }
}

interface Queue<T> {
    fun push(item : T)
    fun pop(): T?
    fun isEmpty(): Boolean
}

class ArrayQueue<T>(val base: MutableList<T>): MutableList<T> by base, Queue<T> {
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

class File(path: String) {
    companion object {
        fun contentsOf(path: String): ByteArray {
            TODO()
        }
    }

    fun exists(): Boolean {
        TODO()
    }

    fun createNewFile() {
        TODO("not implemented") //To change body of created functions use File | Settings | File Templates.
    }
}

fun objectInputOf(f: File): ObjectInput {
    TODO()
}

fun objectOutputOf(f: File): ObjectOutput {
    TODO()
}
