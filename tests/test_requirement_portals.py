import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from bs4 import BeautifulSoup
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import requirement_portals as portals

class RequirementPortalsTests(unittest.TestCase):
    def test_parser_excludes_articles_jobs_and_wrong_domains(self):
        raw = """<a href="/study/courses">Find courses</a>
        <a href="https://news.example.edu/stories/2026/hello">New degree programme</a>
        <a href="/jobs/apply">Apply for teaching position</a>
        <a href="/study/non-degree">Non-degree programmes</a>
        <a href="https://evil.example.com/admissions">Admissions</a>"""
        self.assertEqual(portals.anchors(raw, BeautifulSoup(raw, 'html.parser'), 'https://www.example.edu/'),
                         [('Find courses', 'https://www.example.edu/study/courses')])

    def test_blocked_destination_is_only_a_navigation_link(self):
        home = '<html><title>University</title><a href="/study/courses">Find courses</a></html>' * 4
        def document(url, refresh=False):
            if url.endswith('/study/courses'):
                raise ValueError('blocked')
            return home, BeautifulSoup(home, 'html.parser'), 'University'
        with patch.object(portals, 'document', side_effect=document):
            result = portals.discover({'id':'fixture', 'name':'Fixture', 'website':'https://www.example.edu/'})
        self.assertEqual(result['links'][0]['verification'], 'official-link')
        self.assertEqual(result['links'][0]['verificationUrl'], 'https://www.example.edu/')
        self.assertIn('blocked', result['links'][0]['destinationCheck'])

    def test_refresh_rechecks_existing_pages_without_resetting_failed_check_date(self):
        old_link = {'url':'https://www.example.edu/admissions', 'label':'Admissions', 'scope':'all',
                    'discoveredFrom':'https://www.example.edu/admissions', 'checkedAt':'2026-01-01',
                    'verification':'page-checked', 'verificationUrl':'https://www.example.edu/admissions',
                    'sha256':'a'*64}
        school = {'id':'fixture', 'name':'Fixture', 'admissionSources':[{**old_link, 'title':'Admissions', 'kind':'directory'}]}
        with patch.object(portals, 'document', side_effect=ValueError('offline')) as fetch:
            result = portals.discover(school, {'links':[old_link]}, refresh=True)
        fetch.assert_called_once_with(old_link['url'], True)
        self.assertEqual(result['links'][0]['checkedAt'], '2026-01-01')
        self.assertIn('offline', result['links'][0]['destinationCheck'])

if __name__ == '__main__':
    unittest.main()
