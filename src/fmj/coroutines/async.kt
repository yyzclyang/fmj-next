package fmj.coroutines

import kotlin.coroutines.experimental.Continuation
import kotlin.coroutines.experimental.EmptyCoroutineContext
import kotlin.coroutines.experimental.startCoroutine

fun spawn(block: suspend () -> Unit) {
    block.startCoroutine(object: Continuation<Unit> {
        override val context = EmptyCoroutineContext
        override fun resume(value: Unit) {}
        override fun resumeWithException(exception: Throwable) {
            throw exception
        }
    })
}
