import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent, { UserEvent } from '@testing-library/user-event';
import { ApiSelectField } from './ApiSelectField';
import { ApiSelectFieldOptionsSchema, parseOptions } from '../../schema';

// ---------------------------------------------------------------------------
// Suppress MUI + jsdom act() warnings
//
// MUI's Autocomplete uses requestAnimationFrame internally for popup transitions.
// These fire outside of act() in jsdom, producing noisy warnings that are not
// actionable — the component and tests behave correctly.
// See: https://github.com/mui/material-ui/issues/15726
// ---------------------------------------------------------------------------

const originalError = console.error.bind(console);

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((msg: unknown, ...args: unknown[]) => {
    if (typeof msg === 'string' && msg.includes('not wrapped in act')) return;
    originalError(msg, ...args);
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Mock Backstage APIs
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
const mockGetBaseUrl = jest.fn().mockResolvedValue('http://localhost:7007/api/proxy');

jest.mock('@backstage/core-plugin-api', () => ({
  useApi: (ref: { id: string }) => {
    if (ref.id === 'core.fetch') return { fetch: mockFetch };
    if (ref.id === 'core.discovery') return { getBaseUrl: mockGetBaseUrl };
    throw new Error(`Unexpected API ref: ${ref.id}`);
  },
  fetchApiRef: { id: 'core.fetch' },
  discoveryApiRef: { id: 'core.discovery' },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FieldProps = {
  path?: string;
  multiple?: boolean;
  minItems?: number;
  arrayParams?: Record<string, string[]>;
  params?: Record<string, string>;
  arraySelector?: string;
  valueSelector?: string;
  labelSelector?: string;
  onChange?: jest.Mock;
  formData?: string | string[];
  rawErrors?: string[];
};

/** Build minimal component props for testing. */
function makeProps(overrides: FieldProps = {}) {
  const {
    path = 'test-api/items',
    multiple,
    minItems,
    arrayParams,
    params,
    arraySelector,
    valueSelector,
    labelSelector,
    onChange = jest.fn(),
    formData = undefined,
    rawErrors = [],
  } = overrides;

  return {
    onChange,
    rawErrors,
    required: false,
    formData,
    uiSchema: {
      'ui:options': {
        path,
        ...(multiple !== undefined && { multiple }),
        ...(minItems !== undefined && { minItems }),
        ...(arrayParams && { arrayParams }),
        ...(params && { params }),
        ...(arraySelector && { arraySelector }),
        ...(valueSelector && { valueSelector }),
        ...(labelSelector && { labelSelector }),
      },
    },
    schema: { title: 'My Field' },
    // The remaining FieldExtensionComponentProps are not used by ApiSelectField.
  } as any;
}

/** Build a successful JSON fetch response. */
function mockSuccess(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  });
}

/** Build a failed fetch response. */
function mockFailure(status = 500, statusText = 'Internal Server Error') {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve({}),
  });
}

// ---------------------------------------------------------------------------
// Schema tests
// ---------------------------------------------------------------------------

describe('ApiSelectFieldOptionsSchema', () => {
  it('accepts a minimal config with just a path', () => {
    const result = ApiSelectFieldOptionsSchema.safeParse({ path: 'api/items' });
    expect(result.success).toBe(true);
  });

  it('applies default values when optional fields are omitted', () => {
    const opts = parseOptions({ path: 'api/items' });
    expect(opts.valueSelector).toBe('value');
    expect(opts.labelSelector).toBe('label');
    expect(opts.multiple).toBe(false);
  });

  it('rejects a config without a path', () => {
    const result = ApiSelectFieldOptionsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects a path that is an empty string', () => {
    const result = ApiSelectFieldOptionsSchema.safeParse({ path: '' });
    expect(result.success).toBe(false);
  });

  it('accepts all optional fields when provided', () => {
    const result = ApiSelectFieldOptionsSchema.safeParse({
      path: 'api/items',
      params: { region: 'eu-west-1' },
      arrayParams: { exclude: ['foo', 'bar'] },
      arraySelector: 'data.items',
      valueSelector: 'id',
      labelSelector: 'name',
      multiple: true,
      minItems: 2,
      placeholder: 'Choose one…',
    });
    expect(result.success).toBe(true);
  });

  it('rejects minItems less than 1', () => {
    const result = ApiSelectFieldOptionsSchema.safeParse({ path: 'api/items', minItems: 0 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Component — loading and fetch
// ---------------------------------------------------------------------------

describe('ApiSelectField — fetch behaviour', () => {
  let user: UserEvent;

  beforeEach(() => {
    // userEvent.setup() wraps all interactions in act() automatically,
    // which prevents "not wrapped in act" warnings from MUI's internal state updates.
    user = userEvent.setup();
    jest.clearAllMocks();
    mockGetBaseUrl.mockResolvedValue('http://localhost:7007/api/proxy');
  });

  it('shows a loading indicator while fetching options', async () => {
    // The fetch never resolves during this test so loading stays visible.
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    render(<ApiSelectField {...makeProps()} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders options returned by the API', async () => {
    mockSuccess([
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ]);

    render(<ApiSelectField {...makeProps()} />);

    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('shows an error message when the API call fails', async () => {
    mockFailure(503, 'Service Unavailable');

    render(<ApiSelectField {...makeProps()} />);

    expect(await screen.findByText(/API returned 503/i)).toBeInTheDocument();
  });

  it('shows an error message when the response is not an array', async () => {
    mockSuccess({ not: 'an array' });

    render(<ApiSelectField {...makeProps()} />);

    expect(await screen.findByText(/not an array/i)).toBeInTheDocument();
  });

  it('calls onChange with the selected value', async () => {
    const onChange = jest.fn();
    mockSuccess([
      { value: 'eu-west-1', label: 'EU West 1' },
      { value: 'us-east-1', label: 'US East 1' },
    ]);

    render(<ApiSelectField {...makeProps({ onChange })} />);

    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('EU West 1'));

    expect(onChange).toHaveBeenCalledWith('eu-west-1');
  });
});

// ---------------------------------------------------------------------------
// Component — URL building
// ---------------------------------------------------------------------------

describe('ApiSelectField — URL building', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBaseUrl.mockResolvedValue('http://localhost:7007/api/proxy');
    mockSuccess([]);
  });

  it('calls the correct URL from the path option', async () => {
    render(<ApiSelectField {...makeProps({ path: 'myapi/buckets' })} />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:7007/api/proxy/myapi/buckets');
  });

  it('adds simple params as query parameters', async () => {
    render(
      <ApiSelectField
        {...makeProps({ path: 'myapi/items', params: { region: 'eu-west-1', env: 'prod' } })}
      />,
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('region=eu-west-1');
    expect(url).toContain('env=prod');
  });

  it('adds array params as repeated query entries', async () => {
    render(
      <ApiSelectField
        {...makeProps({
          path: 'myapi/items',
          arrayParams: { exclude: ['foo', 'bar'] },
        })}
      />,
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const url = mockFetch.mock.calls[0][0] as string;
    // Both values must appear as separate entries, not comma-separated.
    expect(url).toContain('exclude=foo');
    expect(url).toContain('exclude=bar');
    expect(url).not.toContain('exclude=foo%2Cbar');
  });
});

// ---------------------------------------------------------------------------
// Component — arraySelector
// ---------------------------------------------------------------------------

describe('ApiSelectField — arraySelector', () => {
  let user: UserEvent;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockGetBaseUrl.mockResolvedValue('http://localhost:7007/api/proxy');
  });

  it('navigates into a nested property before reading options', async () => {
    mockSuccess({ result: { items: [{ value: 'x', label: 'X' }] } });

    render(<ApiSelectField {...makeProps({ arraySelector: 'result.items' })} />);

    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByText('X')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Component — multiselect and minItems
// ---------------------------------------------------------------------------

describe('ApiSelectField — multiselect', () => {
  let user: UserEvent;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockGetBaseUrl.mockResolvedValue('http://localhost:7007/api/proxy');
  });

  it('allows selecting multiple values when multiple is true', async () => {
    const onChange = jest.fn();
    mockSuccess([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);

    render(<ApiSelectField {...makeProps({ multiple: true, onChange })} />);

    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByText('A'));

    expect(onChange).toHaveBeenCalledWith(['a']);
  });

  it('shows a minItems error when not enough options are selected', async () => {
    mockSuccess([{ value: 'a', label: 'A' }]);

    render(
      <ApiSelectField
        {...makeProps({ multiple: true, minItems: 2, formData: ['a'] })}
      />,
    );

    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

    expect(screen.getByText(/please select at least 2 options/i)).toBeInTheDocument();
  });

  it('does not show a minItems error when enough options are selected', async () => {
    mockSuccess([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]);

    render(
      <ApiSelectField
        {...makeProps({ multiple: true, minItems: 2, formData: ['a', 'b'] })}
      />,
    );

    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

    expect(screen.queryByText(/please select at least/i)).not.toBeInTheDocument();
  });
});
