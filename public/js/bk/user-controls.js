/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
function hslToRgb(h, s, l) {
	let r; let g; let
		b;

	if (s == 0) {
		r = g = b = l; // achromatic
	} else {
		const hue2rgb = function hue2rgb(p, q, t) {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

const KEY = {
	ESC: 27, SPACE: 32, LEFT: 37, ROTATE: 38, RIGHT: 39, DOWN: 40,
};

$(() => {
	$('.keys div.space, .keys .row > div').click(function () {
		if (!$('.keys').hasClass('off') && !$('.keys').hasClass('paused')) {
			$('canvas').removeClass('moveDown moveLeft moveRight rotate');
			switch ($(this).data('code')) {
			case KEY.LEFT: setTimeout(() => {
				$('canvas').addClass('moveLeft');
			}, 5); break;
			case KEY.RIGHT: setTimeout(() => {
				$('canvas').addClass('moveRight');
			}, 5); break;
			case KEY.DOWN: setTimeout(() => {
				$('canvas').addClass('moveDown');
			}, 5); break;
			case KEY.ROTATE: setTimeout(() => {
				$('canvas').addClass('rotate');
			}, 5); break;
			}
		}
		socket.emit('action', $(this).data('code'));
	});

	let usercolor = hslToRgb(
		(Math.random()),
		(Math.random() * 0.25 + 0.5),
		(Math.random() * 0.25 + 0.25),
	);

	$('body').attr('style', `--user-color: rgba(${usercolor.r},${usercolor.g},${usercolor.b}, 1)`);
	$('#new_color').click(() => {
		usercolor = hslToRgb(
			(Math.random()),
			(Math.random() * 0.25 + 0.5),
			(Math.random() * 0.25 + 0.25),
		);
		$('body').attr('style', `--user-color: rgba(${usercolor.r},${usercolor.g},${usercolor.b}, 1)`);
	});
	$('#add').click(() => {
		$('.keys').removeClass('hide');
		$('#new_user').addClass('hide');
		//resize();
		socket.emit('add user', usercolor);
		$('body').css('background', `rgba(${usercolor.r},${usercolor.g},${usercolor.b}, 1)`);
	});
});
