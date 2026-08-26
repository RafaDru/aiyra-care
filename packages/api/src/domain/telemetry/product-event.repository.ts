import type { ProductEventInput, ProductEventRecord } from './product-event.js'

export interface ProductEventRepository {
  insertMany(
    accountId: string | null,
    events: ProductEventInput[],
  ): Promise<ProductEventRecord[]>
}
