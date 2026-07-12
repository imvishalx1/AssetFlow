import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios';
import { MOCK_USER } from '../../auth/mock';

/* ------------------------------------------------------------------ *
 * In-memory mock backend used only when VITE_MOCK_AUTH=true.
 * Lets the entire UI run with zero database so the demo is clickable.
 * Endpoints mirror the real API envelope: { success, data }.
 * ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyObj = Record<string, any>;

let seq = 1000;
const uid = (p: string) => `${p}_${++seq}`;
const now = () => new Date().toISOString();
const daysFromNow = (d: number) => new Date(Date.now() + d * 864e5).toISOString();

const assets: AnyObj[] = [
  { _id: 'a1', tag: 'AF-0001', name: 'Dell Latitude 7440', categoryId: { name: 'Laptops' }, serialNumber: 'DL-7741', acquisitionDate: daysFromNow(-120), acquisitionCost: 145000, condition: 'Good', location: 'HQ-2F', status: 'Allocated', isBookable: false, departmentId: { name: 'Engineering' }, history: [{ type: 'Registered', at: daysFromNow(-120) }, { type: 'Allocated', at: daysFromNow(-30) }] },
  { _id: 'a2', tag: 'AF-0002', name: 'Conference Room Projector', categoryId: { name: 'AV Equipment' }, serialNumber: 'PRJ-22', acquisitionDate: daysFromNow(-200), acquisitionCost: 89000, condition: 'Good', location: 'Conf-A', status: 'Available', isBookable: true, departmentId: null, history: [{ type: 'Registered', at: daysFromNow(-200) }] },
  { _id: 'a3', tag: 'AF-0003', name: 'Honda Generator EU2200', categoryId: { name: 'Power' }, serialNumber: 'GN-2200', acquisitionDate: daysFromNow(-400), acquisitionCost: 210000, condition: 'Fair', location: 'Warehouse', status: 'Under Maintenance', isBookable: false, departmentId: { name: 'Facilities' }, history: [{ type: 'Registered', at: daysFromNow(-400) }, { type: 'Under Maintenance', at: daysFromNow(-5) }] },
  { _id: 'a4', tag: 'AF-0004', name: 'MacBook Pro 16"', categoryId: { name: 'Laptops' }, serialNumber: 'MB-1601', acquisitionDate: daysFromNow(-90), acquisitionCost: 249000, condition: 'New', location: 'HQ-3F', status: 'Available', isBookable: false, departmentId: { name: 'Design' }, history: [{ type: 'Registered', at: daysFromNow(-90) }] },
  { _id: 'a5', tag: 'AF-0005', name: 'Standing Desk', categoryId: { name: 'Furniture' }, serialNumber: 'DSK-05', acquisitionDate: daysFromNow(-300), acquisitionCost: 32000, condition: 'Good', location: 'HQ-2F', status: 'Available', isBookable: false, departmentId: null, history: [] },
  { _id: 'a6', tag: 'AF-0006', name: 'Meeting Room B (Bookable)', categoryId: { name: 'Rooms' }, serialNumber: 'RM-B', acquisitionDate: daysFromNow(-500), acquisitionCost: 0, condition: 'New', location: 'HQ-1F', status: 'Available', isBookable: true, departmentId: null, history: [] },
  { _id: 'a7', tag: 'AF-0007', name: 'Forklift CAT', categoryId: { name: 'Machinery' }, serialNumber: 'FL-01', acquisitionDate: daysFromNow(-700), acquisitionCost: 850000, condition: 'Poor', location: 'Yard', status: 'Retired', isBookable: false, departmentId: { name: 'Operations' }, history: [{ type: 'Registered', at: daysFromNow(-700) }, { type: 'Retired', at: daysFromNow(-20) }] },
  { _id: 'a8', tag: 'AF-0008', name: 'Server Rack Dell', categoryId: { name: 'IT Infrastructure' }, serialNumber: 'SRV-08', acquisitionDate: daysFromNow(-600), acquisitionCost: 1200000, condition: 'Good', location: 'DC-1', status: 'Allocated', isBookable: false, departmentId: { name: 'IT' }, history: [{ type: 'Registered', at: daysFromNow(-600) }, { type: 'Allocated', at: daysFromNow(-200) }] },
  { _id: 'a9', tag: 'AF-0009', name: 'Drone Inspection Unit', categoryId: { name: 'Machinery' }, serialNumber: 'DRN-09', acquisitionDate: daysFromNow(-150), acquisitionCost: 175000, condition: 'Good', location: 'Yard', status: 'Available', isBookable: false, departmentId: null, history: [] },
  { _id: 'a10', tag: 'AF-0010', name: 'Training Room (Bookable)', categoryId: { name: 'Rooms' }, serialNumber: 'RM-TR', acquisitionDate: daysFromNow(-480), acquisitionCost: 0, condition: 'New', location: 'HQ-2F', status: 'Available', isBookable: true, departmentId: null, history: [] },
];

const allocations: AnyObj[] = [
  { _id: 'al1', assetId: { _id: 'a1', tag: 'AF-0001', name: 'Dell Latitude 7440' }, userId: { _id: 'u2', name: 'Priya Menon', email: 'priya@assetflow.com' }, status: 'Active', expectedReturnDate: daysFromNow(10), allocatedAt: daysFromNow(-30) },
  { _id: 'al2', assetId: { _id: 'a8', tag: 'AF-0008', name: 'Server Rack Dell' }, userId: { _id: 'u5', name: 'Arjun Rao', email: 'arjun@assetflow.com' }, status: 'Active', expectedReturnDate: null, allocatedAt: daysFromNow(-200) },
];

const bookings: AnyObj[] = [
  { _id: 'b1', resourceId: { _id: 'a2', tag: 'AF-0002', name: 'Conference Room Projector' }, userId: { _id: 'u1', name: 'Demo Admin' }, title: 'Quarterly Review', startTime: daysFromNow(1) + '',  endTime: '', status: 'Upcoming' },
];
// give the seeded booking a real overlapping window for the demo
bookings[0].startTime = new Date(Date.now() + 864e5).toISOString().slice(0, 11) + '14:00:00.000Z';
bookings[0].endTime = new Date(Date.now() + 864e5).toISOString().slice(0, 11) + '15:00:00.000Z';

const departments: AnyObj[] = [
  { _id: 'd1', name: 'Engineering', isActive: true, headUserId: { name: 'Vikram Singh' } },
  { _id: 'd2', name: 'Design', isActive: true, headUserId: { name: 'Neha Kapoor' } },
  { _id: 'd3', name: 'Facilities', isActive: true, headUserId: { name: 'Ravi Kumar' } },
  { _id: 'd4', name: 'IT', isActive: true, headUserId: { name: 'Arjun Rao' } },
];

const categories: AnyObj[] = [
  { _id: 'c1', name: 'Laptops', key: 'laptops', customFields: [] },
  { _id: 'c2', name: 'AV Equipment', key: 'av-equipment', customFields: [] },
  { _id: 'c3', name: 'Rooms', key: 'rooms', customFields: [] },
  { _id: 'c4', name: 'Machinery', key: 'machinery', customFields: [] },
  { _id: 'c5', name: 'Furniture', key: 'furniture', customFields: [] },
];

const users: AnyObj[] = [
  { _id: 'u1', name: 'Demo Admin', email: 'admin@assetflow.com', role: 'Admin', departmentId: { name: 'IT' }, status: 'Active' },
  { _id: 'u2', name: 'Priya Menon', email: 'priya@assetflow.com', role: 'Asset Manager', departmentId: { name: 'Engineering' }, status: 'Active' },
  { _id: 'u3', name: 'Vikram Singh', email: 'vikram@assetflow.com', role: 'Department Head', departmentId: { name: 'Engineering' }, status: 'Active' },
  { _id: 'u4', name: 'Neha Kapoor', email: 'neha@assetflow.com', role: 'Department Head', departmentId: { name: 'Design' }, status: 'Active' },
  { _id: 'u5', name: 'Arjun Rao', email: 'arjun@assetflow.com', role: 'Employee', departmentId: { name: 'IT' }, status: 'Active' },
  { _id: 'u6', name: 'Ravi Kumar', email: 'ravi@assetflow.com', role: 'Employee', departmentId: { name: 'Facilities' }, status: 'Inactive' },
];

const maintenance: AnyObj[] = [
  { _id: 'm1', assetId: { _id: 'a3', tag: 'AF-0003', name: 'Honda Generator EU2200' }, raisedBy: { name: 'Ravi Kumar' }, description: 'Won\'t start — possible fuel line blockage', priority: 'High', status: 'In Progress', technician: 'MechServ', createdAt: daysFromNow(-5) },
  { _id: 'm2', assetId: { _id: 'a4', tag: 'AF-0004', name: 'MacBook Pro 16"' }, raisedBy: { name: 'Neha Kapoor' }, description: 'Battery swelling observed', priority: 'Critical', status: 'Approved', createdAt: daysFromNow(-2) },
  { _id: 'm3', assetId: { _id: 'a2', tag: 'AF-0002', name: 'Conference Room Projector' }, raisedBy: { name: 'Priya Menon' }, description: 'HDMI port loose', priority: 'Medium', status: 'Pending', createdAt: daysFromNow(-1) },
  { _id: 'm4', assetId: { _id: 'a9', tag: 'AF-0009', name: 'Drone Inspection Unit' }, raisedBy: { name: 'Vikram Singh' }, description: 'Calibration drift', priority: 'Low', status: 'Technician Assigned', technician: 'SkyTech', createdAt: daysFromNow(-3) },
  { _id: 'm5', assetId: { _id: 'a1', tag: 'AF-0001', name: 'Dell Latitude 7440' }, raisedBy: { name: 'Arjun Rao' }, description: 'Keyboard key stuck', priority: 'Medium', status: 'Resolved', createdAt: daysFromNow(-8) },
];

const audits: AnyObj[] = [
  { _id: 'au1', name: 'Q3 Engineering Audit', scopeType: 'Department', scopeValue: 'Engineering', dateRange: { start: daysFromNow(-10), end: daysFromNow(-1) }, auditors: [{ name: 'Priya Menon' }], status: 'Open', locked: false, items: [
    { assetId: { _id: 'a1', tag: 'AF-0001', name: 'Dell Latitude 7440' }, result: 'Verified' },
    { assetId: { _id: 'a4', tag: 'AF-0004', name: 'MacBook Pro 16"' }, result: 'Missing' },
    { assetId: { _id: 'a5', tag: 'AF-0005', name: 'Standing Desk' }, result: 'Pending' },
  ] },
  { _id: 'au2', name: 'Facilities Spot Check', scopeType: 'Location', scopeValue: 'Warehouse', dateRange: { start: daysFromNow(-5), end: daysFromNow(2) }, auditors: [{ name: 'Ravi Kumar' }], status: 'Closed', locked: true, items: [
    { assetId: { _id: 'a3', tag: 'AF-0003', name: 'Honda Generator EU2200' }, result: 'Damaged' },
  ] },
];

const activity: AnyObj[] = [
  { _id: 'ac1', actorId: { name: 'Priya Menon' }, action: 'ASSET_ALLOCATE', target: 'asset:a1', createdAt: daysFromNow(-0.1) },
  { _id: 'ac2', actorId: { name: 'Arjun Rao' }, action: 'ASSET_REGISTER', target: 'asset:a9', createdAt: daysFromNow(-0.2) },
  { _id: 'ac3', actorId: { name: 'Demo Admin' }, action: 'AUDIT_CREATE', target: 'audit:au1', createdAt: daysFromNow(-0.3) },
  { _id: 'ac4', actorId: { name: 'Neha Kapoor' }, action: 'MAINTENANCE_RAISE', target: 'asset:a4', createdAt: daysFromNow(-0.4) },
  { _id: 'ac5', actorId: { name: 'Priya Menon' }, action: 'BOOKING_CREATE', target: 'booking:b1', createdAt: daysFromNow(-0.5) },
];

/* ----------------------------- routing ----------------------------- */

interface MockResult { status: number; data: AnyObj }

function jsonBody(cfg: AxiosRequestConfig): AnyObj {
  if (!cfg.data) return {};
  return typeof cfg.data === 'string' ? JSON.parse(cfg.data) : cfg.data;
}

function findActiveAllocation(assetId: string): AnyObj | undefined {
  return allocations.find((a) => a.assetId._id === assetId && a.status === 'Active');
}

function calcSummary() {
  const byStatus: AnyObj[] = [];
  const counts: AnyObj = {};
  assets.forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });
  Object.entries(counts).forEach(([k, v]) => byStatus.push({ _id: k, count: v }));
  const totalAcquisitionCost = assets.reduce((s, a) => s + (a.acquisitionCost ?? 0), 0);
  return {
    totalAssets: assets.length,
    byStatus,
    byCondition: [],
    activeAllocations: allocations.filter((a) => a.status === 'Active').length,
    upcomingBookings: bookings.filter((b) => b.status === 'Upcoming' || b.status === 'Ongoing').length,
    openMaintenance: maintenance.filter((m) => !['Resolved'].includes(m.status)).length,
    overdueAllocations: allocations.filter((a) => a.status === 'Active' && a.expectedReturnDate && new Date(a.expectedReturnDate) < new Date()).length,
    totalAcquisitionCost,
  };
}

function route(method: string, path: string, body: AnyObj, params: AnyObj): MockResult {
  // strip query from path for matching
  const p = path.split('?')[0];

  // ---- Assets ----
  if (p === '/assets' && method === 'get') return { status: 200, data: { assets } };
  if (p === '/assets' && method === 'post') {
    const asset = { _id: uid('a'), tag: `AF-${String(assets.length + 1).padStart(4, '0')}`, status: 'Available', history: [{ type: 'Registered', at: now() }], ...body };
    assets.push(asset);
    return { status: 201, data: { asset } };
  }

  // ---- Allocations ----
  if (p === '/allocations' && method === 'get') {
    let list = allocations;
    if (params.assetId) list = list.filter((a) => a.assetId._id === params.assetId);
    if (params.status) list = list.filter((a) => a.status === params.status);
    return { status: 200, data: { allocations: list } };
  }
  if (p === '/allocations' && method === 'post') {
    const active = findActiveAllocation(body.assetId);
    if (active) {
      return {
        status: 409,
        data: { code: 'ALLOCATION_CONFLICT', message: `Asset is currently held by ${active.userId.name}. Initiate a Transfer Request instead.`, holder: active.userId.name },
      };
    }
    const asset = assets.find((a) => a._id === body.assetId);
    const user = (users.find((u) => u._id === (body.userId ?? MOCK_USER.id)) ?? MOCK_USER) as AnyObj;
    const alloc = { _id: uid('al'), assetId: { _id: asset?._id, tag: asset?.tag, name: asset?.name }, userId: { _id: user._id, name: user.name, email: user.email }, status: 'Active', expectedReturnDate: body.expectedReturnDate ?? null, allocatedAt: now() };
    allocations.push(alloc);
    if (asset) asset.status = 'Allocated';
    return { status: 201, data: { allocation: alloc } };
  }
  let m = p.match(/^\/allocations\/([^/]+)\/transfer$/);
  if (m && method === 'post') {
    return { status: 201, data: { transfer: { _id: uid('t'), assetId: m[1], status: 'Requested', requestedBy: MOCK_USER.id } } };
  }
  m = p.match(/^\/allocations\/([^/]+)\/return$/);
  if (m && method === 'post') {
    const a = allocations.find((x) => x._id === m![1]);
    if (a) { a.status = 'Returned'; a.returnedAt = now(); const asset = assets.find((x) => x._id === a.assetId._id); if (asset) asset.status = 'Available'; }
    return { status: 200, data: { allocation: a ?? {} } };
  }

  // ---- Bookings ----
  if (p === '/bookings' && method === 'get') {
    let list = bookings;
    if (params.resourceId) list = list.filter((b) => b.resourceId._id === params.resourceId);
    if (params.status) list = list.filter((b) => b.status === params.status);
    return { status: 200, data: { bookings: list } };
  }
  if (p === '/bookings' && method === 'post') {
    const start = new Date(body.startTime).getTime();
    const end = new Date(body.endTime).getTime();
    const conflict = bookings.find(
      (b) => b.resourceId._id === body.resourceId && b.status !== 'Cancelled' && new Date(b.startTime).getTime() < end && new Date(b.endTime).getTime() > start,
    );
    if (conflict) {
      return {
        status: 409,
        data: { code: 'BOOKING_OVERLAP', message: 'This shared resource is already booked for overlapping times.', requested: { start: body.startTime, end: body.endTime }, conflicting: { start: conflict.startTime, end: conflict.endTime } },
      };
    }
    const res = { _id: uid('b'), resourceId: { _id: body.resourceId, tag: 'AF', name: 'Resource' }, userId: { _id: MOCK_USER.id, name: MOCK_USER.name }, title: body.title, startTime: body.startTime, endTime: body.endTime, status: 'Upcoming' };
    bookings.push(res);
    return { status: 201, data: { booking: res } };
  }

  // ---- Departments / Categories ----
  if (p === '/departments' && method === 'get') return { status: 200, data: { departments } };
  if (p === '/departments' && method === 'post') { const d = { _id: uid('d'), ...body }; departments.push(d); return { status: 201, data: { department: d } }; }
  if (p === '/categories' && method === 'get') return { status: 200, data: { categories } };
  if (p === '/categories' && method === 'post') { const c = { _id: uid('c'), ...body }; categories.push(c); return { status: 201, data: { category: c } }; }

  // ---- Users / promotion ----
  if (p === '/users' && method === 'get') return { status: 200, data: { users } };
  m = p.match(/^\/users\/([^/]+)\/promote$/);
  if (m && method === 'patch') {
    const u = users.find((x) => x._id === m![1]);
    if (u) u.role = body.role;
    return { status: 200, data: { user: u ?? {} } };
  }

  // ---- Maintenance ----
  if (p === '/maintenance' && method === 'get') return { status: 200, data: { maintenance } };
  if (p === '/maintenance' && method === 'post') { const mt = { _id: uid('m'), raisedBy: { name: MOCK_USER.name }, status: 'Pending', createdAt: now(), ...body }; maintenance.push(mt); return { status: 201, data: { maintenance: mt } }; }
  m = p.match(/^\/maintenance\/([^/]+)$/);
  if (m && method === 'patch') { const mt = maintenance.find((x) => x._id === m![1]); if (mt) Object.assign(mt, body); return { status: 200, data: { maintenance: mt ?? {} } }; }

  // ---- Audits ----
  if (p === '/audits' && method === 'get') return { status: 200, data: { cycles: audits } };
  if (p === '/audits' && method === 'post') { const cy = { _id: uid('au'), status: 'Open', locked: false, items: [], auditors: (body.auditorIds ?? []).map((id: string) => ({ name: users.find((u) => u._id === id)?.name ?? 'Auditor' })), ...body }; audits.push(cy); return { status: 201, data: { cycle: cy } }; }
  m = p.match(/^\/audits\/([^/]+)\/items\/([^/]+)$/);
  if (m && method === 'patch') {
    const cy = audits.find((x) => x._id === m![1]);
    const item = cy?.items.find((i: AnyObj) => i.assetId._id === m![2]);
    if (item) { item.result = body.result; item.note = body.note; }
    return { status: 200, data: { cycle: cy ?? {} } };
  }
  m = p.match(/^\/audits\/([^/]+)\/close$/);
  if (m && method === 'post') {
    const cy = audits.find((x) => x._id === m![1]);
    if (cy) { cy.status = 'Closed'; cy.locked = true; cy.items.forEach((i: AnyObj) => { if (i.result === 'Missing') { const a = assets.find((x) => x._id === i.assetId._id); if (a) a.status = 'Lost'; } }); }
    return { status: 200, data: { cycle: cy ?? {} } };
  }

  // ---- Analytics / Activity ----
  if (p === '/analytics/summary' && method === 'get') return { status: 200, data: calcSummary() };
  if (p === '/activity-logs' && method === 'get') return { status: 200, data: { logs: activity, total: activity.length, page: 1, limit: 50 } };

  // ---- Auth ----
  if (p === '/auth/me' && method === 'get') return { status: 200, data: { user: MOCK_USER } };

  return { status: 404, data: { code: 'NOT_FOUND', message: `Mock has no handler for ${method.toUpperCase()} ${p}` } };
}

export const mockAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? 'get').toLowerCase();
  const body = jsonBody(config);
  const params = (config.params as AnyObj) ?? {};
  const res = route(method, config.url ?? '', body, params);

  await new Promise((r) => setTimeout(r, 120)); // simulate latency

  if (res.status >= 400) {
    const err: AnyObj = new Error('Mock request failed');
    err.response = { status: res.status, data: { success: false, error: res.data } };
    throw err;
  }
  return {
    data: { success: true, data: res.data },
    status: res.status,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
  } as AxiosResponse;
};
