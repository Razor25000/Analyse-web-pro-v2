import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportAuditModal } from '@/components/nowts/export-audit-modal';
import userEvent from '@testing-library/user-event';

// Mock the dialog manager with proper structure
vi.mock('@/features/dialog-manager/dialog-manager', () => ({
  default: {
    custom: vi.fn(),
    close: vi.fn(),
    closeAll: vi.fn(),
    confirm: vi.fn(),
    input: vi.fn(),
  },
}));

describe('ExportAuditModal', () => {
  const defaultProps = {
    isOpen: false,
    onClose: vi.fn(),
    onExport: vi.fn(),
    currentJob: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Component Initialization', () => {
    it('should render null (dialog is managed by dialog manager)', () => {
      const { container } = render(<ExportAuditModal {...defaultProps} />);

      expect(container.firstChild).toBeNull();
    });

    it('should call dialogManager.custom on mount', () => {
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager').dialogManager
      );

      render(<ExportAuditModal {...defaultProps} />);

      expect(mockDialogManager.custom).toHaveBeenCalledWith({
        title: "Exporter les audits",
        description: "Configurez l'export de vos audits au format souhaité",
        children: expect.anything(),
        action: expect.anything(),
        cancel: expect.anything(),
        size: "lg",
        variant: "default",
        style: "default",
      });
    });
  });

    it('should use default dialog description', () => {
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager').dialogManager
      );

      render(<ExportAuditModal {...defaultProps} />);

      expect(mockDialogManager.custom).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Configurez l'export de vos audits au format souhaité",
        })
      );
    });
  });

  describe('Dialog Content', () => {
    it('should contain all form fields', () => {
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager').dialogManager
      );

      render(<ExportAuditModal {...defaultProps} />);

      const dialogCall = mockDialogManager.custom.mock.calls[0];
      const dialogContent = dialogCall[0].children;

      expect(dialogContent).toBeDefined();

      // Create a wrapper div to render the dialog content for testing
      const wrapper = document.createElement('div');
      wrapper.innerHTML = '';
      render(dialogContent, { container: wrapper });

      // Check for main form elements
      expect(screen.getByText('Format d\'export')).toBeInTheDocument();
      expect(screen.getByText('Statuts à inclure')).toBeInTheDocument();
      expect(screen.getByText('Options')).toBeInTheDocument();
    });
  });

  describe('Form Functionality', () => {
    it('should have format selection with all required options', () => {
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager').dialogManager
      );

      render(<ExportAuditModal {...defaultProps} />);

      const dialogCall = mockDialogManager.custom.mock.calls[0];
      const dialogContent = dialogCall[0].children;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = '';
      render(dialogContent, { container: wrapper });

      // Check format options
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('HTML')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });

    it('should include available status options', () => {
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager').dialogManager
      );

      render(<ExportAuditModal {...defaultProps} />);

      const dialogCall = mockDialogManager.custom.mock.calls[0];
      const dialogContent = dialogCall[0].children;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = '';
      render(dialogContent, { container: wrapper });

      // Check status options
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screenByDisplayValue('Error')).toBeInTheDocument();
    });

    it('should include score minimum options', () => {
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager').dialogManager
      );

      render(<ExportAuditModal {...defaultProps} />);

      const dialogCall = mockDialogManager.mock.calls[0];
      const dialogContent = dialogCall[0].children;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = '';
      render(dialogContent, { container: wrapper });

      // Check score options
      expect(screen.getByText('Tous les scores')).toBeInTheDocument();
      expect(screen.getByText('50+ points')).toBeInTheDocument();
      expect(screen.getByText('70+ points')).toBeInTheDocument();
      expect(screen.getByText('85+ points')).toBeInTheDocument();
      expect(screen.getByText('95+ points')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should call onExport with form data when submitted', async () => {
      const mockOnExport = vi.fn().mockResolvedValue({
        success: true,
        downloadUrl: '/api/audits/export/download/test123',
      });
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager').dialogManager
      );

      render(<ExportAuditModal {...defaultProps} onExport={mockOnExport} />);

      const dialogCall = mockDialogManager.custom.mock.calls[0];
      const dialogContent = dialogCall[0].children;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = '';
      render(dialogContent, { container: wrapper });

      const user = userEvent.setup();

      // Fill form
      await user.selectOptions(screen.getByLabelText('Format d\'export'), 'json');
      await user.click(screen.getByLabelText('Inclure les métadonnées'));

      // Submit form
      const submitButton = screen.getByText('Exporter');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnExport).toHaveBeenCalledWith({
          format: 'json',
          filters: {
            status: [],
            auditType: [],
            minScore: 0,
          },
          includeMetadata: true,
          includeScreenshots: false,
        });
      });
    });

    it('should show loading state during export', async () => {
      const mockOnExport = vi.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      });
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager').dialogManager
      );

      render(<ExportAuditModal {...defaultProps} onExport={mockOnExport} />);

      const dialogCall = mockDialogManager.custom.mock.calls[0];
      const dialogContent = dialogCall[0].children;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = '';
      render(dialogContent, { container: wrapper });

      const user = userEvent.setup();

      // Submit form
      const submitButton = screen.getByText('Exporter');
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Exportation...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should show success state on successful export', async () => {
      const mockOnExport = vi.fn().mockResolvedValue({
        success: true,
        downloadUrl: '/api/audits/export/download/test123',
      });
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager').dialogManager
      );

      render(<ExportAuditModal {...defaultProps} onExport={mockOnExport} />);

      const dialogCall = mockDialogManager.custom.mock.calls[0];
      const dialogContent = dialogCall[0].children;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = '';
      render(dialogContent, { container: wrapper });

      const user = userEvent.setup();

      // Submit form
      await user.click(screen.getByText('Exporter'));

      await waitFor(() => {
        expect(mockOnExport).toHaveBeenCalled();
        expect(screen.getByText('Export terminé avec succès')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });

    it('should open download URL when export completes successfully', async () => {
      const originalOpen = window.open;
      window.open = vi.fn();

      const mockOnExport = vi.fn().mockResolvedValue({
        success: true,
        downloadUrl: '/api/audits/export/download/test123',
      });
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager').dialogManager
      );

      render(<ExportAuditModal {...defaultProps} onExport={mockOnExport} />);

      const dialogCall = mockDialogManager.custom.mock.calls[0];
      const dialogContent = dialogCall[0].children;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = '';
      render(dialogContent, { container: wrapper });

      const user = userEvent.setup();

      // Submit form
      await user.click(screen.getByText('Exporter'));

      await waitFor(() => {
        expect(window.open).toHaveBeenCalledWith('/api/audits/export/download/test123', '_blank');
      });

      // Restore original function
      window.open = originalOpen;
    });

    it('should show error state on failed export', async () => {
      const mockOnExport = vi.fn().mockResolvedValue({
        success: false,
        error: 'Test error message',
      });
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager').dialogManager
      );

      render(<ExportAuditModal {...defaultProps} onExport={mockOnExport} />);

      const dialogCall = mockDialogManager.custom.mock.calls[0];
      const dialogContent = dialogCall[0].children;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = '';
      render(dialogContent, { container: wrapper });

      const user = userEvent.setup();

      // Submit form
      await user.click(screen.getByText('Exporter'));

      await waitFor(() => {
        expect(mockOnExport).toHaveBeenCalled();
        expect(screen.getByText('Erreur lors de l\'export')).toBeInTheDocument();
        expect(screen.getByText('Test error message')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Display', () => {
    it('should show progression section during export', async () => {
      const mockOnExport = vi.fn().mockImplementation(async (config) => {
        // Simulate some delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          success: true,
          downloadUrl: '/api/audits/export/download/test123',
        };
      });
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager').dialogManager
      );

      render(<ExportAuditModal {...defaultProps} onExport={mockOnExport} />);

      const dialogCall = mockDialogManager.custom.mock.calls[0];
      const dialogContent = dialogCall[0].children;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = '';
      render(dialogContent, { container: wrapper });

      const user = userEvent.setup();

      // Submit form
      await user.click(screen.getByText('Exporter'));

      await waitFor(() => {
        expect(screen.getByText('Progression')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should allow cancel when not exporting', () => {
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager').dialogManager
      );
      const mockCancel = vi.fn();
      mockDialogManager.custom.mockImplementation((options) => {
        return {
          ...options,
          cancel: mockCancel,
        };
      });

      render(<ExportAuditModal {...defaultProps} />);

      expect(mockCancel).toBeDefined();
    });

    it('should disable cancel when exporting', async () => {
      const mockOnExport = vi.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      });
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager')
      );
      const mockCancel = vi.fn();
      mockDialogManager.custom.mockImplementation((options) => {
        return {
          ...options,
          cancel: mockCancel,
        };
      });

      render(<ExportAuditModal {...defaultProps} onExport={mockOnExport} />);

      const dialogCall = mockDialogManager.custom.mock.calls[0];
      const dialogContent = dialogCall[0].children;

      const wrapper = document.createElement('div');
      wrapper.innerHTML = '';
      render(dialogContent, { container: wrapper });

      const user = userEvent.setup();

      // Submit form
      await user.click(screen.getByText('Exporter'));

      const cancelButton = screen.getByText('Annuler');
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty availableStatuses gracefully', () => {
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager')
      );

      render(<ExportAuditModal {...defaultProps} />);

      expect(mockDialogManager.custom).toHaveBeenCalled();
    });

    it('should handle availableStatuses gracefully', () => {
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager')
      );

      render(<ExportAuditModal {...defaultProps} />);

      expect(mockDialogManager.custom).toHaveBeenCalled();
    });

    it('should handle currentJob null', () => {
      const mockDialogManager = vi.mocked(
        require('@/features/dialog-manager/dialog-manager/dialog-manager')
      );

      render(
        <ExportAuditModal
          isOpen={true}
          onClose={vi.fn()}
          onExport={vi.fn()}
          currentJob={null}
        />
      );

      expect(mockDialogManager.custom).toHaveBeenCalled();
    });
  });