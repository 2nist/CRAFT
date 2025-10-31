import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SchemaPropertyCard } from '../../src/App';

describe('SchemaPropertyCard', () => {
  const mockOnUpdate = jest.fn();
  const mockOnDelete = jest.fn();

  const defaultProps = {
    propertyKey: 'testProperty',
    property: {
      type: 'string',
      description: 'A test property'
    },
    onUpdate: mockOnUpdate,
    onDelete: mockOnDelete,
    isRequired: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders property key and type correctly', () => {
    render(<SchemaPropertyCard {...defaultProps} />);

    expect(screen.getByText('testProperty')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Text (string)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A test property')).toBeInTheDocument();
  });

  it('shows required badge when property is required', () => {
    render(<SchemaPropertyCard {...defaultProps} isRequired={true} />);

    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('calls onUpdate when type is changed', async () => {
    const user = userEvent.setup();
    render(<SchemaPropertyCard {...defaultProps} />);

    const typeSelect = screen.getByDisplayValue('Text (string)');
    await user.selectOptions(typeSelect, 'Number');

    expect(mockOnUpdate).toHaveBeenCalledWith('testProperty', {
      type: 'number',
      description: 'A test property'
    });
  });

  it('calls onUpdate when description is changed', async () => {
    const user = userEvent.setup();
    render(<SchemaPropertyCard {...defaultProps} />);

    const descriptionInput = screen.getByDisplayValue('A test property');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated description');

    expect(mockOnUpdate).toHaveBeenCalledWith('testProperty', {
      type: 'string',
      description: 'Updated description'
    });
  });

  it('shows enum input when type is string and expanded', async () => {
    const user = userEvent.setup();
    render(<SchemaPropertyCard {...defaultProps} />);

    const expandButton = screen.getByText('−'); // Already expanded in this test
    await user.click(expandButton);

    // Wait for the expanded content to appear
    await waitFor(() => {
      expect(screen.getByText(/Allowed Values \(Enum\)/)).toBeInTheDocument();
    });
  });

  it('calls onUpdate with enum when enum input changes', async () => {
    const user = userEvent.setup();
    render(<SchemaPropertyCard {...defaultProps} />);

    // Find and click expand button
    const expandButton = screen.getByText('−');
    await user.click(expandButton);

    // Wait for enum input to appear
    const enumInput = await screen.findByPlaceholderText('value1, value2, value3');
    await user.type(enumInput, 'option1, option2, option3');

    expect(mockOnUpdate).toHaveBeenCalledWith('testProperty', {
      type: 'string',
      description: 'A test property',
      enum: ['option1', 'option2', 'option3']
    });
  });

  it('shows oneOf input when type is integer and expanded', async () => {
    const user = userEvent.setup();
    render(
      <SchemaPropertyCard
        {...defaultProps}
        property={{ ...defaultProps.property, type: 'integer' }}
      />
    );

    const expandButton = screen.getByText('−');
    await user.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText(/Options \(oneOf\)/)).toBeInTheDocument();
    });
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<SchemaPropertyCard {...defaultProps} />);

    const deleteButton = screen.getByTitle('Delete property');
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('testProperty');
  });

  it('removes enum when type changes from string to number', async () => {
    const user = userEvent.setup();
    const propertyWithEnum = {
      ...defaultProps.property,
      enum: ['value1', 'value2']
    };

    render(<SchemaPropertyCard {...defaultProps} property={propertyWithEnum} />);

    const typeSelect = screen.getByDisplayValue('Text (string)');
    await user.selectOptions(typeSelect, 'Number');

    expect(mockOnUpdate).toHaveBeenCalledWith('testProperty', {
      type: 'number',
      description: 'A test property'
      // enum should be removed
    });
  });

  it('removes oneOf when type changes from integer to string', async () => {
    const user = userEvent.setup();
    const propertyWithOneOf = {
      type: 'integer',
      description: 'A test property',
      oneOf: [{ const: 1, description: 'Option 1' }]
    };

    render(<SchemaPropertyCard propertyKey="testProperty" property={propertyWithOneOf} onUpdate={mockOnUpdate} onDelete={mockOnDelete} isRequired={false} />);

    const typeSelect = screen.getByDisplayValue('Integer');
    await user.selectOptions(typeSelect, 'Text (string)');

    expect(mockOnUpdate).toHaveBeenCalledWith('testProperty', {
      type: 'string',
      description: 'A test property'
      // oneOf should be removed
    });
  });
});