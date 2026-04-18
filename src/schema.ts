import { z } from 'zod';

/**
 * Options you can set on a field via ui:options in your template.yaml.
 *
 * Example:
 * ```yaml
 * myField:
 *   type: string
 *   ui:field: ApiSelectField
 *   ui:options:
 *     path: myapi/countries
 *     valueSelector: code
 *     labelSelector: name
 * ```
 */
export const ApiSelectFieldOptionsSchema = z.object({
  /**
   * API path appended to the Backstage proxy base URL.
   * Example: "myapi/items" → calls /api/proxy/myapi/items
   */
  path: z.string().min(1, 'path is required'),

  /**
   * Static query parameters sent with every request.
   * Example: { region: "eu-west-1", include_empty: "true" }
   */
  params: z.record(z.string(), z.string()).optional(),

  /**
   * Array query parameters. Each value is appended as a separate key.
   * Use this for APIs that expect ?key=a&key=b instead of ?key=a,b.
   * Example: { exclude_patterns: ["^foo-.*", "^bar-.*"] }
   */
  arrayParams: z.record(z.string(), z.array(z.string())).optional(),

  /**
   * Dot-separated path to navigate into the API response before reading options.
   * Leave empty when the response is already an array.
   * Example: "data.items" for a response like { data: { items: [...] } }
   */
  arraySelector: z.string().optional(),

  /**
   * Key used to read the option value from each item in the response.
   * Defaults to "value".
   */
  valueSelector: z.string().default('value'),

  /**
   * Key used to read the option label from each item in the response.
   * Defaults to "label".
   */
  labelSelector: z.string().default('label'),

  /** Allow the user to select more than one option. Defaults to false. */
  multiple: z.boolean().default(false),

  /**
   * Minimum number of options the user must select.
   * Only meaningful when multiple is true.
   */
  minItems: z.number().int().min(1).optional(),

  /** Placeholder text shown inside the input before the user types. */
  placeholder: z.string().optional(),
});

export type ApiSelectFieldOptions = z.infer<typeof ApiSelectFieldOptionsSchema>;

/**
 * Parse and validate ui:options for ApiSelectField.
 * Returns an object with all defaults applied.
 * Throws a ZodError if the options are invalid.
 */
export function parseOptions(raw: unknown): ApiSelectFieldOptions {
  return ApiSelectFieldOptionsSchema.parse(raw);
}
