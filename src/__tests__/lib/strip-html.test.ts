import { stripHtml } from '@/lib/strip-html';

describe('stripHtml', () => {
  it('removes a simple tag', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello');
  });

  it('removes multiple tags', () => {
    expect(stripHtml('<b>bold</b> and <i>italic</i>')).toBe('bold and italic');
  });

  it('replaces tags with a space and collapses whitespace', () => {
    expect(stripHtml('<p>one</p><p>two</p>')).toBe('one two');
  });

  it('handles nested tags', () => {
    expect(stripHtml('<div><span>text</span></div>')).toBe('text');
  });

  it('returns empty string for tag-only input', () => {
    expect(stripHtml('<br/>')).toBe('');
  });

  it('preserves plain text with no tags', () => {
    expect(stripHtml('hello world')).toBe('hello world');
  });

  it('trims leading and trailing whitespace', () => {
    expect(stripHtml('  <p>  text  </p>  ')).toBe('text');
  });

  it('handles an empty string', () => {
    expect(stripHtml('')).toBe('');
  });

  it('handles a lone < without closing >', () => {
    expect(stripHtml('a < b')).toBe('a');
  });

  it('handles attributes inside tags', () => {
    expect(stripHtml('<a href="https://example.com">link</a>')).toBe('link');
  });

  it('collapses multiple spaces in text nodes', () => {
    expect(stripHtml('hello   world')).toBe('hello world');
  });

  it('handles HTML entities left intact (not decoded)', () => {
    expect(stripHtml('&amp;')).toBe('&amp;');
  });
});
