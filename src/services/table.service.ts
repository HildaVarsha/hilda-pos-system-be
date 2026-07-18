import type { TableStatus } from '@prisma/client';
import { tableRepository } from '../repositories/table.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { getSocketServer, SOCKET_EVENTS } from '../socket/index.js';
import type { CreateTableInput } from '../validators/table.validator.js';

function broadcastTableUpdated(): void {
  try {
    getSocketServer().emit(SOCKET_EVENTS.TABLE_UPDATED);
  } catch {
    // Socket server not initialized (e.g. in a script/seed context) — safe to ignore.
  }
}

export const tableService = {
  list() {
    return tableRepository.findAll();
  },

  async getByIdOrThrow(id: string) {
    const table = await tableRepository.findById(id);
    if (!table) {
      throw ApiError.notFound('Table not found');
    }
    return table;
  },

  async create(input: CreateTableInput) {
    const table = await tableRepository.create(input);
    broadcastTableUpdated();
    return table;
  },

  async updateStatus(id: string, status: TableStatus) {
    await this.getByIdOrThrow(id);
    const table = await tableRepository.updateStatus(id, status);
    broadcastTableUpdated();
    return table;
  },

  async delete(id: string): Promise<void> {
    const table = await this.getByIdOrThrow(id);
    if (table.status === 'OCCUPIED') {
      throw ApiError.conflict('Cannot remove a table that currently has an active order');
    }
    await tableRepository.delete(id);
    broadcastTableUpdated();
  },
};
