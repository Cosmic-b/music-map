export default {
  prepare(raw, settings) {
    return { width: settings['dot-size'], height: settings['dot-size'] };
  },
  draw(ctx, object, point) {
    ctx.fillStyle = '#eeeeee';
    ctx.beginPath();
    ctx.arc(point.x, point.y, object.width / 2, 0, Math.PI * 2);
    ctx.fill();
  },
};
