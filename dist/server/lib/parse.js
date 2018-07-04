'use strict';

/**
 * Parsing functions.
 *
 * @author J. Scott Smith
 * @license BSD-2-Clause-FreeBSD
 * @module lib/parse
 */

const path = require('path');

function parseCategoryId(id, basePath) {
  const categoryId = id.toLowerCase();
  const parts = categoryId.split('-');
  const categoryParts = parts;
  const categoryPath = path.join(basePath, ...categoryParts);
  const parentCategoryParts = parts.slice(0, parts.length - 1);
  const parentCategoryId = parentCategoryParts.join('-');
  const parentCategoryPath = path.join(basePath, ...parentCategoryParts);

  return {
    categoryId,
    categoryParts,
    categoryPath,
    parentCategoryId,
    parentCategoryParts,
    parentCategoryPath
  };
}

function parseParentCategoryId(id, basePath) {
  const parentCategoryId = id.toLowerCase();
  const parts = parentCategoryId.split('-');
  const parentCategoryParts = parts;
  const parentCategoryPath = path.join(basePath, ...parentCategoryParts);

  return {
    parentCategoryId,
    parentCategoryParts,
    parentCategoryPath
  };
}

function parseDocumentId(id, basePath) {
  const documentId = id.toLowerCase();
  const parts = documentId.split('-');
  const documentName = `${parts[parts.length - 1]}.json`;
  const categoryParts = parts.slice(0, parts.length - 1);
  const categoryPath = path.join(basePath, ...categoryParts);
  const categoryId = categoryParts.join('-');
  const documentPath = path.join(categoryPath, documentName);

  return {
    categoryId,
    categoryParts,
    categoryPath,
    documentId,
    documentName,
    documentPath
  };
}

module.exports = {
  parseCategoryId,
  parseParentCategoryId,
  parseDocumentId
};