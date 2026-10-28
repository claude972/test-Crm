import { Avatar } from 'kovaa-lab-ui/primitives/data-display';
import { type Agenda } from '../../shared/types/Agenda';

export const WorkspaceIcon = ({
  workspace,
}: {
  workspace: Agenda['workspace'] | null;
}) => (
  <span aria-hidden="true" className="workspace-avatar">
    <Avatar
      src={workspace?.logoUrl || './kovaa-lab.svg'}
      name={workspace?.name ?? 'KovaaLab CRM'}
      size="lg"
      shape="square"
    />
  </span>
);
