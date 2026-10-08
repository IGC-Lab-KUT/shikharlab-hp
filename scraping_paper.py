from scholarly import scholarly
import time
import random
import json

# shikhar先生のGoogle scholarのID
AUTHOR_ID = 'PeT97nEAAAAJ'

author = scholarly.search_author_id(AUTHOR_ID)
author_filled = scholarly.fill(author)

publications = author_filled.get('publications', [])
total_pubs = len(publications)

all_data = []

for i, pub in enumerate(publications):

  sleep_time = random.uniform(2.0, 4.0)
  time.sleep(sleep_time)

  pub_filled = scholarly.fill(pub)
  bib_info = pub_filled.get('bib', {})

  year = bib_info.get('pub_year', '')
  title = bib_info.get('title', '')

  author_info = bib_info.get('author', '')
  if isinstance(author_info, list):
    author_names = ', '.join(author_info)
  else:
    author_names = author_info

  journal = bib_info.get('journal', '')
  conference = bib_info.get('conference', '')
  citation = bib_info.get('citation', '')

  venue = journal or conference or citation or ''

  url = pub_filled.get('pub_url', '')

  all_data.append([year, title, author_names, venue, url])
  print(all_data)

