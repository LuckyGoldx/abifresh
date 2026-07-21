export function validateItemsPaidFor(obj: unknown): unknown[] {
  if (!Array.isArray(obj) || obj.length === 0) {
    throw new Error('items_paid_for must be a non-empty array');
  }

  for (const item of obj) {
    if (typeof item !== 'object' || item === null) {
      throw new Error('Each item in items_paid_for must be an object');
    }

    if (typeof item.item_id !== 'string' || !item.item_id) {
      throw new Error('Each item requires a valid item_id');
    }

    if (typeof item.item_name !== 'string' || !item.item_name) {
      throw new Error('Each item requires a valid item_name');
    }

    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      throw new Error('Each item requires a positive quantity');
    }

    if (typeof item.amount !== 'number' || item.amount <= 0) {
      throw new Error('Each item requires a positive amount');
    }

    if (item.sale_ids !== undefined) {
      if (!Array.isArray(item.sale_ids) || !item.sale_ids.every((id: unknown) => typeof id === 'string')) {
        throw new Error('sale_ids must be an array of strings');
      }
    }
  }

  return obj;
}
