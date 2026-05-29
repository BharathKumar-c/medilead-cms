import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultiCheckboxSelect from '../components/MultiCheckboxSelect';

const defaultOptions = ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'];

describe('MultiCheckboxSelect - All Departments behavior', () => {
  /* ── Rendering ────────────────────────────────────────── */
  it('renders trigger button with placeholder when nothing selected', () => {
    render(
      <MultiCheckboxSelect
        options={defaultOptions}
        selected={[]}
        onChange={() => {}}
        placeholder="Select allowed departments..."
      />
    );

    expect(screen.getByTestId('multi-select-trigger')).toHaveTextContent(
      'Select allowed departments...'
    );
  });

  it('shows selected count when some options are selected', () => {
    render(
      <MultiCheckboxSelect
        options={defaultOptions}
        selected={['Cardiology', 'Neurology']}
        onChange={() => {}}
      />
    );

    expect(screen.getByTestId('multi-select-trigger')).toHaveTextContent('2 selected');
  });

  it('shows "All Departments" when everything is selected', () => {
    render(
      <MultiCheckboxSelect
        options={defaultOptions}
        selected={[...defaultOptions]}
        onChange={() => {}}
      />
    );

    expect(screen.getByTestId('multi-select-trigger')).toHaveTextContent('All Departments');
  });

  /* ── Opening / closing ─────────────────────────────────── */
  it('opens dropdown when trigger is clicked', async () => {
    render(
      <MultiCheckboxSelect
        options={defaultOptions}
        selected={[]}
        onChange={() => {}}
      />
    );

    await userEvent.click(screen.getByTestId('multi-select-trigger'));
    expect(screen.getByTestId('multi-select-dropdown')).toBeInTheDocument();
  });

  it('closes dropdown on Escape key', async () => {
    render(
      <MultiCheckboxSelect
        options={defaultOptions}
        selected={[]}
        onChange={() => {}}
      />
    );

    await userEvent.click(screen.getByTestId('multi-select-trigger'));
    expect(screen.getByTestId('multi-select-dropdown')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByTestId('multi-select-dropdown')).not.toBeInTheDocument();
  });

  /* ── "All Departments" select all ────────────────────── */
  it('calls onChange with all options when "All Departments" is checked', async () => {
    const handleChange = vi.fn();
    render(
      <MultiCheckboxSelect
        options={defaultOptions}
        selected={[]}
        onChange={handleChange}
      />
    );

    await userEvent.click(screen.getByTestId('multi-select-trigger'));

    const allCheckbox = screen.getByTestId('all-departments-checkbox');
    await userEvent.click(allCheckbox);

    expect(handleChange).toHaveBeenCalledWith(defaultOptions);
  });

  it('calls onChange with empty array when "All Departments" is unchecked while all are selected', async () => {
    const handleChange = vi.fn();
    render(
      <MultiCheckboxSelect
        options={defaultOptions}
        selected={[...defaultOptions]}
        onChange={handleChange}
      />
    );

    await userEvent.click(screen.getByTestId('multi-select-trigger'));

    const allCheckbox = screen.getByTestId('all-departments-checkbox');
    await userEvent.click(allCheckbox);

    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it('shows "4 selected" text next to "All Departments" when all options are selected', async () => {
    render(
      <MultiCheckboxSelect
        options={defaultOptions}
        selected={[...defaultOptions]}
        onChange={() => {}}
      />
    );

    await userEvent.click(screen.getByTestId('multi-select-trigger'));

    const allOption = screen.getByTestId('all-departments-option');
    expect(allOption).toHaveTextContent('4 selected');
  });

  /* ── Indeterminate state ──────────────────────────────── */
  it('shows "All Departments" option when some (not all) options are selected', async () => {
    render(
      <MultiCheckboxSelect
        options={defaultOptions}
        selected={['Cardiology', 'Neurology']}
        onChange={() => {}}
      />
    );

    await userEvent.click(screen.getByTestId('multi-select-trigger'));

    // "All Departments" option should be present
    expect(screen.getByTestId('all-departments-option')).toBeInTheDocument();
  });

  /* ── Individual selection alongside "All Departments" ──── */
  it('selecting a single option works when none selected', async () => {
    const handleChange = vi.fn();
    render(
      <MultiCheckboxSelect
        options={defaultOptions}
        selected={[]}
        onChange={handleChange}
      />
    );

    await userEvent.click(screen.getByTestId('multi-select-trigger'));

    const cardioCheckbox = screen.getByTestId('checkbox-Cardiology');
    await userEvent.click(cardioCheckbox);

    expect(handleChange).toHaveBeenCalledWith(['Cardiology']);
  });

  it('deselecting a single option removes it from selected', async () => {
    const handleChange = vi.fn();
    render(
      <MultiCheckboxSelect
        options={defaultOptions}
        selected={['Cardiology', 'Neurology']}
        onChange={handleChange}
      />
    );

    await userEvent.click(screen.getByTestId('multi-select-trigger'));

    const neuroCheckbox = screen.getByTestId('checkbox-Neurology');
    await userEvent.click(neuroCheckbox);

    expect(handleChange).toHaveBeenCalledWith(['Cardiology']);
  });

  /* ── Search filtering ─────────────────────────────────── */
  it('filters options based on search input', async () => {
    render(
      <MultiCheckboxSelect
        options={defaultOptions}
        selected={[]}
        onChange={() => {}}
      />
    );

    await userEvent.click(screen.getByTestId('multi-select-trigger'));

    const searchInput = screen.getByTestId('multi-search-input');
    await userEvent.type(searchInput, 'Cardio');

    // Cardiology should be visible
    expect(screen.getByTestId('option-Cardiology')).toBeInTheDocument();
    // Neurology should not be visible
    expect(screen.queryByTestId('option-Neurology')).not.toBeInTheDocument();
  });

  it('shows "No options available" when search yields no results', async () => {
    render(
      <MultiCheckboxSelect
        options={defaultOptions}
        selected={[]}
        onChange={() => {}}
      />
    );

    await userEvent.click(screen.getByTestId('multi-select-trigger'));

    const searchInput = screen.getByTestId('multi-search-input');
    await userEvent.type(searchInput, 'XYZ');

    expect(screen.getByText('No options available')).toBeInTheDocument();
  });

  /* ── Object options (via name/label/value) ─────────────── */
  it('handles object options with name property', async () => {
    const objOptions = [
      { name: 'Cardiology' },
      { name: 'Neurology' },
    ];
    const handleChange = vi.fn();
    render(
      <MultiCheckboxSelect
        options={objOptions}
        selected={[]}
        onChange={handleChange}
      />
    );

    await userEvent.click(screen.getByTestId('multi-select-trigger'));

    const allCheckbox = screen.getByTestId('all-departments-checkbox');
    await userEvent.click(allCheckbox);

    expect(handleChange).toHaveBeenCalledWith(['Cardiology', 'Neurology']);
  });

  /* ── Edge cases ────────────────────────────────────────── */
  it('works with empty options array', () => {
    render(
      <MultiCheckboxSelect
        options={[]}
        selected={[]}
        onChange={() => {}}
      />
    );

    expect(screen.getByTestId('multi-select-trigger')).toHaveTextContent('Select...');
  });

  it('does not crash with null/undefined options', () => {
    render(
      <MultiCheckboxSelect
        options={null}
        selected={[]}
        onChange={() => {}}
      />
    );

    expect(screen.getByTestId('multi-select-trigger')).toBeInTheDocument();
  });
});
