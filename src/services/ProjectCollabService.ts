// 项目协作服务（雏形 / prototype）— 非实时同步
// 管理项目协作者（owner/editor/viewer）。当前为框架：仅数据层 + 基础增删查，
// 不实现实时协同编辑、冲突合并、邀请通知等。

import prisma from '@/lib/db';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';

export type CollabRole = 'owner' | 'editor' | 'viewer';

export interface CollaboratorView {
  userId: string;
  nickname: string;
  role: CollabRole;
  status: string;
}

/** 协作服务 */
export class ProjectCollabService {
  /** 列出项目协作者（含 owner） */
  async listCollaborators(projectId: string): Promise<{ projectId: string; ownerId: string; members: CollaboratorView[] }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { collaborators: true },
    });
    if (!project) throw new NotFoundError('项目');

    // ProjectCollaborator 未定义 user 关联，单独批量取昵称
    const userIds = project.collaborators.map((c) => c.userId);
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const members: CollaboratorView[] = [
      { userId: project.userId, nickname: '（项目创建者）', role: 'owner', status: 'active' },
      ...project.collaborators.map((c) => ({
        userId: c.userId,
        nickname: userMap.get(c.userId)?.nickname || c.userId,
        role: c.role as CollabRole,
        status: c.status,
      })),
    ];
    return { projectId, ownerId: project.userId, members };
  }

  /** 添加协作者（仅 owner 可操作） */
  async addCollaborator(
    projectId: string,
    operatorUserId: string,
    targetUserId: string,
    role: CollabRole = 'editor',
  ): Promise<CollaboratorView> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError('项目');
    if (project.userId !== operatorUserId) throw new ForbiddenError('仅项目创建者可添加协作者');
    if (targetUserId === project.userId) throw new ValidationError('创建者已在协作列表中');
    if (role === 'owner') throw new ValidationError('不能添加第二个 owner');

    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundError('目标用户');

    const row = await prisma.projectCollaborator.upsert({
      where: { projectId_userId: { projectId, userId: targetUserId } },
      update: { role, status: 'active' },
      create: { projectId, userId: targetUserId, role, status: 'active' },
    });
    return {
      userId: row.userId,
      nickname: target.nickname || row.userId,
      role: row.role as CollabRole,
      status: row.status,
    };
  }

  /** 移除协作者（仅 owner 可操作） */
  async removeCollaborator(projectId: string, operatorUserId: string, targetUserId: string): Promise<void> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError('项目');
    if (project.userId !== operatorUserId) throw new ForbiddenError('仅项目创建者可移除协作者');
    if (targetUserId === project.userId) throw new ValidationError('不能移除项目创建者');

    await prisma.projectCollaborator.deleteMany({ where: { projectId, userId: targetUserId } });
  }
}

export const projectCollabService = new ProjectCollabService();
