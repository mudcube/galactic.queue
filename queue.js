require('galactic.emitter')

function queue(items, handler, processes) {
	handler || (handler = function (value) { return value })
	processes || (processes = 1)

	var queue = {}
	var _done = false
	var _results = Array.isArray(items) ? [] : {}
	var _resolve
	var _reject
	var _keys = []
	var _items = []

	var _promise = Galactic.emitter(new Promise((resolve, reject) => {
		_resolve = resolve
		_reject = reject
		queue.cancel = cancel
		queue.progress = 0.0
		queue.remaining = 0
		queue.total = 0
		add(items)
		setTimeout(begin, 0)
	}))

	_promise.onProgress = function (handler) {
		return _promise.on('progress', handler)
	}

	return _promise

	function add(items) {
		forEach(items, (item, key) => {
			_items.push(item)
			_keys.push(key)
			queue.remaining ++
			queue.total ++
		})

		function forEach(object, handler) {
			var length = object.length
			if (typeof length === 'number' && length > -1 && length % 1 === 0) {
				for (var i = 0; i < length; i++) {
					handler(object[i], i)
				}
			} else {
				var keys = Object.keys(object)
				for (var i = 0, length = keys.length; i < length; i++) {
					var key = keys[i]
					handler(object[key], key)
				}
			}
		}
	}

	function begin() {
		for (var i = 0; i < processes; i ++) {
			next()
		}
	}

	function next() {
		if (_done) {
			return
		}

		var total = queue.total
		if (total) {
			var remaining = queue.remaining
			var progress = queue.progress = 1.0 - remaining / total
			_promise.emit('progress', progress)

			if (remaining) {
				queue.remaining --
				var index = total - remaining
				var key = _keys[index]
				var item = _items.shift()
				var promise = handler(item, key, queue)
				if (promise && promise.then) {
					promise.then((result) => {
						_results[key] = result
						next()
					}).catch(
						_reject
					)
					return
				}

				_results[key] = promise
				next()
				return
			}
		}

		_done = true
		_resolve(_results)
	}

	function cancel(message) {
		if (_done) {
			return
		}

		_done = true
		_reject({
			name: 'cancel',
			message: message || 'No reason provided',
			results: _results
		})
	}
}

global.Galactic || (global.Galactic = {})
global.Galactic.queue = queue