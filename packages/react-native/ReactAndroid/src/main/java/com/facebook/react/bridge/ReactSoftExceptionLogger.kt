/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.bridge

import androidx.annotation.StringDef
import com.facebook.common.logging.FLog
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.ReactSoftExceptionLogger.Categories.CLIPPING_PROHIBITED_VIEW
import com.facebook.react.bridge.ReactSoftExceptionLogger.Categories.RVG_IS_VIEW_CLIPPED
import com.facebook.react.bridge.ReactSoftExceptionLogger.Categories.RVG_ON_VIEW_REMOVED
import com.facebook.react.bridge.ReactSoftExceptionLogger.Categories.SOFT_ASSERTIONS
import com.facebook.react.bridge.ReactSoftExceptionLogger.Categories.SURFACE_MOUNTING_MANAGER_MISSING_VIEWSTATE
import java.util.concurrent.CopyOnWriteArrayList

@DoNotStrip
public object ReactSoftExceptionLogger {
  @Retention(AnnotationRetention.SOURCE)
  @StringDef(
      RVG_IS_VIEW_CLIPPED,
      RVG_ON_VIEW_REMOVED,
      CLIPPING_PROHIBITED_VIEW,
      SOFT_ASSERTIONS,
      SURFACE_MOUNTING_MANAGER_MISSING_VIEWSTATE)
  public annotation class CategoryMode

  /** Constants that listeners can utilize for custom category-based behavior. */
  public object Categories {
    public const val RVG_IS_VIEW_CLIPPED: String = "ReactViewGroup.isViewClipped"
    public const val RVG_ON_VIEW_REMOVED: String = "ReactViewGroup.onViewRemoved"
    public const val CLIPPING_PROHIBITED_VIEW: String = "ReactClippingProhibitedView"
    public const val SOFT_ASSERTIONS: String = "SoftAssertions"
    public const val SURFACE_MOUNTING_MANAGER_MISSING_VIEWSTATE: String =
        "SurfaceMountingManager:MissingViewState"
  }

  // Use a list instead of a set here because we expect the number of listeners
  // to be very small, and we want listeners to be called in a deterministic
  // order.
  private val listeners: MutableList<ReactSoftExceptionListener> = CopyOnWriteArrayList()

  @JvmStatic
  public fun addListener(listener: ReactSoftExceptionListener): Unit {
    if (!listeners.contains(listener)) {
      listeners.add(listener)
    }
  }

  @JvmStatic
  public fun removeListener(listener: ReactSoftExceptionListener): Unit {
    listeners.remove(listener)
  }

  @JvmStatic
  public fun clearListeners(): Unit {
    listeners.clear()
  }

  @JvmStatic
  public fun logSoftExceptionVerbose(@CategoryMode category: String, cause: Throwable): Unit {
    logSoftException("${category}|${cause.javaClass.simpleName}:${cause.message}", cause)
  }

  @JvmStatic
  public fun logSoftException(@CategoryMode category: String, cause: Throwable): Unit {
    if (!listeners.isEmpty()) {
      for (listener in listeners) {
        listener.logSoftException(category, cause)
      }
    } else {
      FLog.e(category, "Unhandled SoftException", cause)
    }
  }

  @JvmStatic
  @DoNotStrip
  private fun logNoThrowSoftExceptionWithMessage(@CategoryMode category: String, message: String) {
    logSoftException(category, ReactNoCrashSoftException(message))
  }

  public fun interface ReactSoftExceptionListener {
    public fun logSoftException(category: String, cause: Throwable)
  }
}
