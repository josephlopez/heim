var _ = require('lodash')
var React = require('react')


// http://stackoverflow.com/a/16459606
var isWebkit = 'WebkitAppearance' in document.documentElement.style

function clamp(min, v, max) {
  return Math.min(Math.max(min, v), max)
}

module.exports = React.createClass({
  displayName: 'Scroller',

  componentWillMount: function() {
    window.addEventListener('resize', this.onResize)
    this._checkScroll = _.throttle(this.checkScroll, 150)
    this._finishScroll = _.debounce(this.finishScroll, 100)
    this._targetInView = false
    this._anchor = null
    this._anchorPos = null
    this._scrollQueued = false
  },

  componentDidMount: function() {
    this.updateAnchorPos()
  },

  componentWillUnmount: function() {
    window.removeEventListener('resize', this.onResize)
  },

  onResize: function() {
    // When resizing, the goal is to keep the entry onscreen in the same
    // position, if possible. This is accomplished by scrolling relative to the
    // previous display height factored into the pos recorded by updateAnchorPos.
    this.scroll()
  },

  finishScroll: function() {
    this._scrollQueued = false
    this.updateAnchorPos()
  },

  onScroll: function() {
    this._checkScroll()
    this.updateAnchorPos()
  },

  componentDidUpdate: function() {
    this.scroll()
    this.updateAnchorPos()
    this.checkScrollbar()
  },

  updateAnchorPos: function() {
    if (this._scrollQueued) {
      // If we're waiting on a scroll, re-measuring the anchor position may
      // lose track of it if we're in the process of scrolling it onscreen.
      return
    }

    // Record the position of our point of reference. Either the target (if
    // it's in view), or the centermost child element.
    var node = this.refs.scroller.getDOMNode()
    var displayHeight = node.offsetHeight

    var target = node.querySelector(this.props.target)
    var targetPos = node.scrollTop + displayHeight - target.offsetTop
    this._targetInView = targetPos >= target.offsetHeight && targetPos < displayHeight

    var anchor
    if (this._targetInView) {
      this._anchor = target
      this._anchorPos = targetPos
    } else {
      var box = this.getDOMNode().getBoundingClientRect()
      anchor = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
      if (!anchor) {
        console.warn('scroller: unable to find anchor')  // jshint ignore:line
      }
      this._anchor = anchor
      this._anchorPos = anchor && node.scrollTop + displayHeight - anchor.offsetTop
    }
  },

  checkScrollbar: function() {
    var node = this.refs.scroller.getDOMNode()

    if (this.props.onScrollbarSize) {
      var scrollbarWidth = node.offsetWidth - node.clientWidth
      if (scrollbarWidth != this.scrollbarWidth) {
        this.scrollbarWidth = scrollbarWidth
        this.props.onScrollbarSize(scrollbarWidth)
      }
    }
  },

  checkScroll: function() {
    var node = this.refs.scroller.getDOMNode()

    var displayHeight = node.offsetHeight
    if (this.props.onNearTop && node.scrollTop < displayHeight * 2) {
      this.props.onNearTop()
    }
  },

  scroll: function(forceTargetInView) {
    // Scroll so our point of interest (target or anchor) is in the right place.
    var node = this.refs.scroller.getDOMNode()
    var displayHeight = node.offsetHeight
    var target = node.querySelector(this.props.target)

    var newScrollTop = null
    if (forceTargetInView || (this._targetInView && this._anchor != target)) {
      // If the target is onscreen, make sure it's within this.props.edgeSpace
      // from the top or bottom.
      var targetPos = node.scrollTop + displayHeight - target.offsetTop
      var clampedPos = clamp(this.props.edgeSpace, targetPos, displayHeight - this.props.edgeSpace)
      newScrollTop = clampedPos - displayHeight + target.offsetTop
    } else if (this._anchor) {
      // Otherwise, try to keep the anchor element in the same place it was when
      // we last saw it via updateAnchorPos.
      newScrollTop = this._anchorPos - displayHeight + this._anchor.offsetTop
    }

    if (newScrollTop != node.scrollTop && displayHeight != node.scrollHeight) {
      if (isWebkit) {
        // Note: mobile Webkit does this funny thing where getting/setting
        // scrollTop doesn't happen promptly during inertial scrolling. It turns
        // out that setting scrollTop inside a requestAnimationFrame callback
        // circumvents this issue.
        window.requestAnimationFrame(function() {
          node.scrollTop = newScrollTop
        })
      } else {
        node.scrollTop = newScrollTop
      }
      this._scrollQueued = true
      this._finishScroll()
    }
  },

  scrollToTarget: function() {
    this.scroll(true)
  },

  render: function() {
    return (
      <div ref="scroller" onScroll={this.onScroll} className={this.props.className}>
        {this.props.children}
      </div>
    )
  },
})
