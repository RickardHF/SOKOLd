/**
 * Template engine utility for variable substitution in configuration templates
 */

import { readFile } from './filesystem.js';

export interface TemplateVariables {
  PROJECT_NAME: string;
  LANGUAGE: string;
  FRAMEWORK: string | null;
  DATE: string;
  VERSION: string;
  [key: string]: string | null | undefined;
}

/**
 * Substitute template variables in content
 * Variables use {{VARIABLE_NAME}} syntax
 */
export function substituteVariables(content: string, variables: TemplateVariables): string {
  let result = content;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(placeholder, value ?? '');
  }
  
  return result;
}

/**
 * Load template from file and substitute variables
 */
export async function loadAndSubstituteTemplate(
  templatePath: string,
  variables: TemplateVariables
): Promise<string> {
  const templateContent = await readFile(templatePath);
  return substituteVariables(templateContent, variables);
}

/**
 * Extract variable placeholders from template content
 */
export function extractPlaceholders(content: string): string[] {
  const regex = /\{\{([A-Z_]+)\}\}/g;
  const placeholders: string[] = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1]);
    }
  }
  
  return placeholders;
}

/**
 * Validate that all required placeholders have values
 */
export function validateVariables(
  placeholders: string[],
  variables: TemplateVariables
): string[] {
  const missing: string[] = [];
  
  for (const placeholder of placeholders) {
    if (variables[placeholder] === undefined || variables[placeholder] === null) {
      // Allow optional variables like FRAMEWORK to be null
      if (!['FRAMEWORK'].includes(placeholder)) {
        missing.push(placeholder);
      }
    }
  }
  
  return missing;
}

/**
 * Create default template variables from project metadata
 */
export function createTemplateVariables(
  projectName: string,
  language: string,
  framework: string | null,
  version: string
): TemplateVariables {
  return {
    PROJECT_NAME: projectName,
    LANGUAGE: language,
    FRAMEWORK: framework,
    DATE: new Date().toISOString().split('T')[0],
    VERSION: version
  };
}
