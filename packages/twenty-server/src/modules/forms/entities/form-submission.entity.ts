// Form Submission Entity
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FormEntity } from './form.entity';

@Entity('form_submissions')
export class FormSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  formId: string;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ nullable: true })
  submitterId: string;

  @Column({ nullable: true })
  submitterEmail: string;

  @Column({ default: 'completed' })
  status: 'pending' | 'completed' | 'failed';

  @CreateDateColumn()
  submittedAt: Date;
}
