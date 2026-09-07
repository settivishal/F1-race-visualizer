import { describe, expect, it } from 'vitest';
import { isAdminPath } from './admin-path';

describe('isAdminPath', () => {
  it('accepts the admin area', () => {
    expect(isAdminPath('/admin')).toBe(true);
    expect(isAdminPath('/admin/races')).toBe(true);
    expect(isAdminPath('/admin/settings?tab=cron')).toBe(true);
  });

  it('rejects another origin', () => {
    expect(isAdminPath('https://evil.example/admin')).toBe(false);
    // A browser reads a leading `//` as protocol-relative, so this is an
    // absolute URL wearing a path's clothes.
    expect(isAdminPath('//evil.example/admin')).toBe(false);
  });

  it('rejects a path that merely starts with the same letters', () => {
    expect(isAdminPath('/administrator')).toBe(false);
    expect(isAdminPath('/admin-backdoor')).toBe(false);
  });

  it('rejects anything outside the admin area', () => {
    expect(isAdminPath('/races')).toBe(false);
    expect(isAdminPath('')).toBe(false);
  });
});
