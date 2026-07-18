import { categoryRepository } from '../repositories/category.repository.js';
import { ApiError } from '../utils/ApiError.js';
import { prisma } from '../config/prisma.js';
import type { CreateCategoryInput, UpdateCategoryInput } from '../validators/category.validator.js';

export const categoryService = {
  list() {
    return categoryRepository.findAll();
  },

  create(input: CreateCategoryInput) {
    return categoryRepository.create(input);
  },

  async update(id: string, input: UpdateCategoryInput) {
    await this.findByIdOrThrow(id);
    return categoryRepository.update(id, input);
  },

  async delete(id: string): Promise<void> {
    await this.findByIdOrThrow(id);
    const menuItemCount = await prisma.menuItem.count({ where: { categoryId: id } });
    if (menuItemCount > 0) {
      throw ApiError.conflict(
        `Cannot delete a category with ${menuItemCount} menu item(s) attached. Reassign or remove them first.`,
      );
    }
    await categoryRepository.delete(id);
  },

  async findByIdOrThrow(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }
    return category;
  },
};
