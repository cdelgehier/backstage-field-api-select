import { useEffect, useState } from 'react';
import { useApi, fetchApiRef, discoveryApiRef } from '@backstage/core-plugin-api';
import type { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import { parseOptions } from '../../schema';

type Option = { value: string; label: string };

/**
 * A Backstage Scaffolder field that loads its dropdown options from an API
 * via the Backstage proxy.
 *
 * Supports:
 * - Simple and array query parameters
 * - Navigating into nested API responses
 * - Single select and multiselect with autocomplete
 * - Minimum selection validation
 *
 * Register it in your Backstage app with `ApiSelectFieldExtension` and use it
 * in any template.yaml:
 *
 * ```yaml
 * myField:
 *   type: string
 *   ui:field: ApiSelectField
 *   ui:options:
 *     path: myapi/items
 *     valueSelector: id
 *     labelSelector: name
 * ```
 */
/** Replace `${{ parameters.fieldName }}` tokens with values from the live form data. */
function substitute(value: string, allFormData: Record<string, unknown>): string {
  return value.replace(/\$\{\{\s*parameters\.(\w+)\s*\}\}/g, (_, name) => {
    const val = allFormData[name];
    return val != null ? String(val) : '';
  });
}

function substituteParams(
  params: Record<string, string> | undefined,
  allFormData: Record<string, unknown>,
): Record<string, string> | undefined {
  if (!params) return params;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    out[k] = substitute(v, allFormData);
  }
  return out;
}

export function ApiSelectField({
  onChange,
  rawErrors,
  required,
  formData,
  formContext,
  uiSchema,
  schema,
}: FieldExtensionComponentProps<string | string[]>) {
  const fetchApi = useApi(fetchApiRef);
  const discoveryApi = useApi(discoveryApiRef);

  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allFormData = (formContext as any)?.formData ?? {};
  const rawOpts = parseOptions(uiSchema?.['ui:options'] ?? {});
  const opts = {
    ...rawOpts,
    path: substitute(rawOpts.path, allFormData),
    params: substituteParams(rawOpts.params, allFormData),
  };

  // Build a cache key from the options that affect the API call.
  // The effect only re-runs when these values actually change.
  const fetchKey = JSON.stringify({
    path: opts.path,
    params: opts.params,
    arrayParams: opts.arrayParams,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setLoading(true);
      setFetchError(null);

      try {
        const proxyBase = await discoveryApi.getBaseUrl('proxy');

        // Build the query string.
        const qs = new URLSearchParams();

        // TypeScript 6 narrows Object.entries({}) to [string, unknown][],
        // so we explicitly type the fallback objects.
        const staticParams: Record<string, string> = opts.params ?? {};
        for (const [key, value] of Object.entries(staticParams)) {
          qs.set(key, value);
        }

        // Array params: each value is appended as a separate entry.
        // This produces ?key=a&key=b, not ?key=a,b.
        const arrayParams: Record<string, string[]> = opts.arrayParams ?? {};
        for (const [key, values] of Object.entries(arrayParams)) {
          for (const v of values) {
            qs.append(key, v);
          }
        }

        const query = qs.toString() ? `?${qs}` : '';
        const url = `${proxyBase}/${opts.path}${query}`;

        const res = await fetchApi.fetch(url);

        if (!res.ok) {
          throw new Error(`API returned ${res.status} ${res.statusText}`);
        }

        let data: unknown = await res.json();

        // Navigate into a nested property if arraySelector is set.
        // Example: "data.items" reads response.data.items.
        if (opts.arraySelector) {
          for (const key of opts.arraySelector.split('.')) {
            data = (data as Record<string, unknown>)[key];
          }
        }

        if (!Array.isArray(data)) {
          throw new Error(
            'The API response is not an array. ' +
              'Check the arraySelector option or the API endpoint.',
          );
        }

        if (!cancelled) {
          setOptions(
            data.map(item => {
              const record = item as Record<string, unknown>;
              return {
                value: String(record[opts.valueSelector] ?? item),
                label: String(record[opts.labelSelector] ?? record[opts.valueSelector] ?? item),
              };
            }),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setFetchError(
            err instanceof Error ? err.message : 'Could not load options from the API.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [fetchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Validate minItems/maxItems for multiselect.
  const selected = Array.isArray(formData) ? formData : [];
  const minItemsError =
    opts.multiple && opts.minItems !== undefined && selected.length < opts.minItems
      ? `Please select at least ${opts.minItems} option${opts.minItems > 1 ? 's' : ''}.`
      : null;
  const maxItemsError =
    opts.multiple && opts.maxItems !== undefined && selected.length > opts.maxItems
      ? `Please select at most ${opts.maxItems} option${opts.maxItems > 1 ? 's' : ''}.`
      : null;

  const hasError = (rawErrors?.length ?? 0) > 0;
  const helperText = fetchError ?? minItemsError ?? maxItemsError ?? rawErrors?.[0];

  // componentsProps (MUI v5) vs slotProps (MUI v6+) — cast to any for version compat.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paperBorder: any = {
    componentsProps: { paper: { sx: { border: '1px solid', borderColor: 'divider' } } },
  };

  return (
    <Autocomplete
      disablePortal
      {...paperBorder}
      multiple={opts.multiple}
      options={options.map(o => o.value)}
      getOptionLabel={value => options.find(o => o.value === value)?.label ?? value}
      value={
        opts.multiple
          ? selected
          : typeof formData === 'string'
            ? formData
            : null
      }
      loading={loading}
      getOptionDisabled={option =>
        opts.multiple && opts.maxItems !== undefined
          ? selected.length >= opts.maxItems && !selected.includes(option as string)
          : false
      }
      onChange={(_, newValue) => onChange(newValue as string | string[])}
      renderInput={params => {
        // MUI v5: renderInput params carries InputProps (no slotProps).
        // MUI v6+: renderInput params carries slotProps.input (InputProps removed from types).
        // Cast to any to read whichever is present without a compile-time error.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = params as any;
        const inputSlot = p.slotProps?.input ?? p.InputProps ?? {};
        const spinner = loading ? <CircularProgress color="inherit" size={18} /> : null;
        const inputWithSpinner = {
          ...inputSlot,
          endAdornment: <>{spinner}{inputSlot.endAdornment}</>,
        };

        // Pass the merged slot back using the same API that was provided.
        const slotOverride = p.slotProps
          ? { slotProps: { ...p.slotProps, input: inputWithSpinner } }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          : ({ InputProps: inputWithSpinner } as any);

        return (
          <TextField
            {...params}
            label={schema.title}
            placeholder={opts.placeholder}
            required={required}
            error={hasError || !!minItemsError}
            helperText={helperText}
            // Float the label when a placeholder is set to prevent label/placeholder overlap.
            InputLabelProps={{
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...(params as any).InputLabelProps,
              shrink: !!(opts.placeholder || (p.slotProps?.input ?? p.InputProps)?.startAdornment || formData),
            }}
            {...slotOverride}
          />
        );
      }}
    />
  );
}
