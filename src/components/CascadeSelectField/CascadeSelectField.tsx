import { useEffect } from 'react';
import type { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import { z } from 'zod';

const CascadeOptionSchema = z.object({ value: z.string(), label: z.string() });

const CascadeSelectFieldOptionsSchema = z.object({
  primary: z.object({
    label: z.string().optional(),
    options: z.array(CascadeOptionSchema),
  }),
  secondary: z.object({
    label: z.string().optional(),
    optionsByPrimary: z.record(z.string(), z.array(CascadeOptionSchema)),
  }),
});

export type CascadeSelectFieldOptions = z.infer<typeof CascadeSelectFieldOptionsSchema>;
export type CascadeValue = { primary: string; secondary: string };

/**
 * A Backstage Scaffolder field that renders two dependent static selects in a
 * single component, bypassing the rjsf `dependencies.oneOf` rendering order
 * limitation (dependency-injected fields always render after all `properties`
 * fields regardless of YAML order).
 *
 * Returns `{ primary, secondary }` as the field value. Reference each part in
 * subsequent `ApiSelectField` paths with dotted notation:
 *   `${{ parameters.os_combo.secondary }}`
 *
 * Usage in template.yaml:
 * ```yaml
 * os_combo:
 *   type: object
 *   title: Operating System
 *   ui:field: CascadeSelectField
 *   ui:options:
 *     primary:
 *       label: OS Family
 *       options:
 *         - { value: linux,   label: Linux }
 *         - { value: windows, label: Windows Server }
 *     secondary:
 *       label: Distribution
 *       optionsByPrimary:
 *         linux:
 *           - { value: amzn2,        label: Amazon Linux 2 (amzn2) }
 *           - { value: al2023,       label: Amazon Linux 2023 (al2023) }
 *         windows:
 *           - { value: windows-w2k22, label: Windows Server 2022 (w2k22) }
 *           - { value: windows-w2k19, label: Windows Server 2019 (w2k19) }
 * ```
 */
export function CascadeSelectField({
  onChange,
  rawErrors,
  required,
  formData,
  uiSchema,
  schema,
}: FieldExtensionComponentProps<CascadeValue>) {
  const opts = CascadeSelectFieldOptionsSchema.parse(uiSchema?.['ui:options'] ?? {});

  const primaryValue = formData?.primary ?? '';
  const secondaryValue = formData?.secondary ?? '';
  const secondaryOptions = primaryValue ? (opts.secondary.optionsByPrimary[primaryValue] ?? []) : [];

  // Reset secondary when primary changes and the current secondary is no longer valid.
  useEffect(() => {
    if (primaryValue && secondaryValue && !secondaryOptions.some(o => o.value === secondaryValue)) {
      onChange({ primary: primaryValue, secondary: '' });
    }
  }, [primaryValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasError = (rawErrors?.length ?? 0) > 0;
  const errorText: string | undefined = rawErrors?.[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paperBorder: any = {
    componentsProps: { paper: { sx: { border: '1px solid', borderColor: 'divider' } } },
  };

  return (
    <Stack spacing={2}>
      <Autocomplete
        disablePortal
        {...paperBorder}
        options={opts.primary.options.map(o => o.value)}
        getOptionLabel={v => opts.primary.options.find(o => o.value === v)?.label ?? v}
        value={primaryValue || null}
        onChange={(_, newValue: string | null) => onChange({ primary: newValue ?? '', secondary: '' })}
        renderInput={params => (
          <TextField
            {...params}
            label={opts.primary.label ?? schema.title}
            required={required}
            error={hasError && !primaryValue}
            helperText={!primaryValue ? errorText : undefined}
          />
        )}
      />
      <Autocomplete
        disablePortal
        {...paperBorder}
        disabled={!primaryValue}
        options={secondaryOptions.map(o => o.value)}
        getOptionLabel={v => secondaryOptions.find(o => o.value === v)?.label ?? v}
        value={secondaryValue || null}
        onChange={(_, newValue: string | null) => onChange({ primary: primaryValue, secondary: newValue ?? '' })}
        renderInput={params => (
          <TextField
            {...params}
            label={opts.secondary.label}
            required={required}
            error={hasError && !!primaryValue && !secondaryValue}
            helperText={primaryValue && !secondaryValue ? errorText : undefined}
          />
        )}
      />
    </Stack>
  );
}
