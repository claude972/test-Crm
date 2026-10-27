// Form Service
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormEntity } from './entities/form.entity';
import { FormSubmissionEntity } from './entities/form-submission.entity';

@Injectable()
export class FormService {
  private readonly logger = new Logger(FormService.name);

  constructor(
    @InjectRepository(FormEntity)
    private formRepo: Repository<FormEntity>,
    @InjectRepository(FormSubmissionEntity)
    private submissionRepo: Repository<FormSubmissionEntity>,
  ) {}

  async createForm(data: {
    title: string;
    description?: string;
    fields: Record<string, any>;
    workspaceId?: string;
  }): Promise<FormEntity> {
    this.logger.debug(`Creating new form: ${data.title}`);
    const form = this.formRepo.create({
      ...data,
      isActive: true,
    });
    return this.formRepo.save(form);
  }

  async getForm(id: string): Promise<FormEntity | null> {
    return this.formRepo.findOne({ where: { id } });
  }

  async listForms(workspaceId?: string): Promise<FormEntity[]> {
    const where: Record<string, any> = {};
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }
    return this.formRepo.find({ where });
  }

  async submitForm(formId: string, data: Record<string, any>, submitterEmail?: string): Promise<FormSubmissionEntity> {
    this.logger.debug(`Processing form submission for ${formId}`);
    const submission = this.submissionRepo.create({
      formId,
      data,
      submitterEmail,
      status: 'completed',
    });
    return this.submissionRepo.save(submission);
  }

  async getSubmissions(formId: string): Promise<FormSubmissionEntity[]> {
    return this.submissionRepo.find({ where: { formId } });
  }
}
