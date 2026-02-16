import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

const ensureDataFile = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(ORDERS_FILE);
  } catch {
    await fs.writeFile(ORDERS_FILE, "[]", "utf8");
  }
};

const readOrders = async () => {
  await ensureDataFile();
  const raw = await fs.readFile(ORDERS_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeOrders = async (orders) => {
  await ensureDataFile();
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8");
};

export const listOrders = async () => {
  const orders = await readOrders();
  return orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

export const getOrderById = async (id) => {
  const orders = await readOrders();
  return orders.find((order) => order.id === id) ?? null;
};

export const getOrderByExternalReference = async (externalReference) => {
  const orders = await readOrders();
  return orders.find((order) => order.id === externalReference) ?? null;
};

export const createOrder = async (order) => {
  const orders = await readOrders();
  orders.push(order);
  await writeOrders(orders);
  return order;
};

export const updateOrder = async (id, updater) => {
  const orders = await readOrders();
  const index = orders.findIndex((order) => order.id === id);
  if (index === -1) return null;

  const current = orders[index];
  const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
  orders[index] = next;
  await writeOrders(orders);
  return next;
};
