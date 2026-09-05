// routes/visibility.js —— 小管理员可见性工具（用户确认的规则）：
// 小管理员（PRACTITIONER）只能看到"自己名下、且未过期"的预约；能看这些预约对应病人的
// 全部病历/处方。过期规则：预约时间段结束时刻 + 24 小时后，预约、以及该病人的病历和处方
// 对这位小管理员自动不可见（大管理员 SENIOR 始终可见全部记录）。
const db = require('../db');

// slot id: '9-10','11-12','2-3','4-5'（12小时制起止、每格1小时），返回结束时刻的24小时制小时
function slotEndHour24(slotId){
  var parts = String(slotId || '').split('-');
  if(parts.length < 2) return null;
  var end = parseInt(parts[1], 10);
  if(isNaN(end)) return null;
  return end <= 5 ? end + 12 : end; // 1-5 点为下午
}

// 预约"可见截止时刻" = 预约时间段结束时刻 + 24 小时（马来西亚 UTC+8 固定）
function bookingVisibleEndMs(b){
  var day = b.appt_date_iso || (b.appt_date || '').slice(0,10);
  if(!day) return null;
  var endHour = slotEndHour24(b.slot);
  var endMs;
  if(endHour != null){
    endMs = new Date(day + 'T' + String(endHour).padStart(2,'0') + ':00:00+08:00').getTime();
  } else {
    // 没有时间段时，以当天 23:59 为结束
    endMs = new Date(day + 'T23:59:00+08:00').getTime();
  }
  if(isNaN(endMs)) return null;
  return endMs + 24 * 3600 * 1000;
}

// 该预约此刻对小管理员是否仍可见（未过期）
function isBookingVisibleNow(b, nowMs){
  var end = bookingVisibleEndMs(b);
  if(end == null) return false;
  return nowMs < end;
}

// 小管理员当前可见的病人手机号集合：自己名下、未取消、未过期的预约对应的客户
function visiblePatientPhonesFor(practitionerId, nowMs){
  var rows = db.prepare(`
    SELECT bookings.*, customers.phone AS customer_phone
    FROM bookings JOIN customers ON bookings.customer_id = customers.id
    WHERE bookings.practitioner_id = ? AND bookings.cancelled = 0
  `).all(practitionerId);
  var phones = {};
  rows.forEach(function(b){
    if(b.customer_phone && isBookingVisibleNow(b, nowMs)) phones[b.customer_phone] = true;
  });
  return Object.keys(phones);
}

module.exports = { slotEndHour24, bookingVisibleEndMs, isBookingVisibleNow, visiblePatientPhonesFor };
